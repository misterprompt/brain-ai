"""
Intelligent AI Router with multi-provider fallback and quota management
Routes requests to best available AI provider based on quotas and availability
"""
import os
import time
from typing import Optional, Dict, Any
from groq import Groq
import httpx
from dotenv import load_dotenv
from services.cache import cache_service
from services.circuit_breaker import circuit_breaker
try:
    from services.retry_handler import with_retry
except ImportError:
    # Fallback si retry_handler n'existe pas
    def with_retry(func):
        return func

# Fallback simple for provider personalities (module deleted)
def enhance_for_provider(prompt: str, provider: str) -> str:
    """Simple pass-through - provider personalities removed."""
    return prompt

load_dotenv()


class AIProvider:
    """Base AI provider class"""
    
    def __init__(self, name: str, priority: int, daily_quota: int = 0):
        self.name = name
        self.priority = priority
        self.daily_quota = daily_quota  # 0 = unlimited
        self.available = False
        self.last_error = None
    
    @property
    def requests_today(self) -> int:
        """Get current requests count from Redis"""
        return cache_service.get_quota_usage(self.name)
        
    def increment_usage(self):
        """Increment usage count in Redis"""
        cache_service.increment_quota_usage(self.name)
    
    def can_handle_request(self) -> bool:
        """Check if provider can handle another request"""
        return cache_service.check_quota_available(self.name, self.daily_quota)
    
    async def call(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 2048) -> str:
        """Call AI provider - to be implemented by subclasses"""
        raise NotImplementedError


class GroqProvider(AIProvider):
    """Groq AI provider (Llama 3.1) - 30 req/min, ~14,400/day"""
    
    def __init__(self):
        super().__init__("groq", priority=2, daily_quota=14000)
        api_key = os.getenv("GROQ_API_KEY")
        
        if api_key and api_key != "your_groq_api_key_here":
            try:
                self.client = Groq(api_key=api_key)
                self.available = True
                print("[OK] Groq provider initialized (14k req/day)")
            except Exception as e:
                print(f"[WARN] Groq initialization failed: {e}")
                self.available = False
        else:
            print("[WARN] Groq API key not configured")
            self.available = False
    
    @circuit_breaker(name="groq")
    @with_retry()
    async def call(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 8000) -> str:
        """Call Groq API - supports up to 8000 tokens for DEEP mode"""
        try:
            messages = []
            
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            
            messages.append({"role": "user", "content": prompt})
            
            completion = self.client.chat.completions.create(
                messages=messages,
                model="llama-3.3-70b-versatile",
                temperature=0.8,  # Augmenté pour plus de diversité
                max_tokens=max_tokens,  # Dynamic: up to 8000 for DEEP mode
            )
            
            self.increment_usage()
            return completion.choices[0].message.content
        
        except Exception as e:
            self.last_error = str(e)
            raise Exception(f"Groq API error: {e}")


class MistralProvider(AIProvider):
    """Mistral AI provider - 1B tokens/month"""
    
    def __init__(self):
        super().__init__("mistral", priority=1, daily_quota=100000)
        api_key = os.getenv("MISTRAL_API_KEY")
        
        if api_key and api_key != "your_mistral_api_key_here":
            try:
                self.api_key = api_key
                self.available = True
                print("[OK] Mistral provider initialized (1B tokens/month)")
            except Exception as e:
                print(f"[WARN] Mistral initialization failed: {e}")
                self.available = False
        else:
            print("[WARN] Mistral API key not configured")
            self.available = False
    
    @circuit_breaker(name="mistral")
    @with_retry()
    async def call(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 4000) -> str:
        """Call Mistral API"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})
                
                response = await client.post(
                    "https://api.mistral.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": "mistral-small-latest",
                        "messages": messages,
                        "temperature": 0.8,  # Augmenté pour plus de diversité
                        "max_tokens": max_tokens  # Dynamic
                    }
                )
                
                if response.status_code == 200:
                    self.increment_usage()
                    return response.json()["choices"][0]["message"]["content"]
                else:
                    raise Exception(f"Mistral returned status {response.status_code}")
        
        except Exception as e:
            self.last_error = str(e)
            raise Exception(f"Mistral API error: {e}")


class ClaudeProvider(AIProvider):
    """Anthropic Claude 3.5 Haiku - Ultra fiable, parfait pour les conversations"""
    
    def __init__(self):
        super().__init__("claude", priority=1, daily_quota=100000)  # Priority 1 = BACKUP
        api_key = os.getenv("ANTHROPIC_API_KEY")
        
        if api_key and api_key.startswith("sk-ant-"):
            try:
                self.api_key = api_key
                self.available = True
                print("[OK] Claude Haiku provider initialized (most reliable)")
            except Exception as e:
                print(f"[WARN] Claude initialization failed: {e}")
                self.available = False
        else:
            print("[WARN] Anthropic API key not configured")
            self.available = False
    
    @circuit_breaker(name="claude")
    @with_retry()
    async def call(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 4096) -> str:
        """Call Claude API - Haiku model"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                messages = [{"role": "user", "content": prompt}]
                
                payload = {
                    "model": "claude-3-5-haiku-20241022",
                    "max_tokens": max_tokens,
                    "messages": messages
                }
                
                if system_prompt:
                    payload["system"] = system_prompt
                
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    },
                    json=payload
                )
                
                if response.status_code == 200:
                    self.increment_usage()
                    return response.json()["content"][0]["text"]
                else:
                    error_detail = response.text[:200]
                    raise Exception(f"Claude returned status {response.status_code}: {error_detail}")
        
        except Exception as e:
            self.last_error = str(e)
            raise Exception(f"Claude API error: {e}")


class GeminiProvider(AIProvider):
    """Google Gemini provider - 1,500 req/day"""
    
    def __init__(self):
        super().__init__("gemini", priority=3, daily_quota=1500)
        api_key = os.getenv("GEMINI_API_KEY")
        
        if api_key and api_key != "your_gemini_api_key_here":
            try:
                self.api_key = api_key
                self.available = True
                print("[OK] Gemini provider initialized (1,500 req/day)")
            except Exception as e:
                print(f"[WARN] Gemini initialization failed: {e}")
                self.available = False
        else:
            print("[WARN] Gemini API key not configured")
            self.available = False
    
    @circuit_breaker(name="gemini")
    @with_retry()
    async def call(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 8000) -> str:
        """Call Gemini API"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
                
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={self.api_key}",
                    json={
                        "contents": [{"parts": [{"text": full_prompt}]}],
                        "generationConfig": {
                            "temperature": 0.8,  # Augmenté pour plus de diversité
                            "maxOutputTokens": max_tokens  # Dynamic
                        }
                    }
                )
                
                if response.status_code == 200:
                    self.increment_usage()
                    return response.json()["candidates"][0]["content"]["parts"][0]["text"]
                else:
                    raise Exception(f"Gemini returned status {response.status_code}")
        
        except Exception as e:
            self.last_error = str(e)
            raise Exception(f"Gemini API error: {e}")


class OpenRouterProvider(AIProvider):
    """DeepSeek-V3 via OpenRouter - Le Challenger n°1 (Moins cher, aussi fort)"""
    
    def __init__(self):
        super().__init__("openrouter", priority=0, daily_quota=100000)  # Priority 0 = MASTER
        api_key = os.getenv("OPENROUTER_API_KEY")
        
        if api_key and api_key.startswith("sk-or-"):
            try:
                self.api_key = api_key
                self.available = True
                print("[OK] DeepSeek-V3 (OpenRouter) initialized (Priority 0)")
            except Exception as e:
                print(f"[WARN] OpenRouter initialization failed: {e}")
                self.available = False
        else:
            print("[WARN] OpenRouter API key not configured")
            self.available = False
    
    @circuit_breaker(name="openrouter")
    @with_retry()
    async def call(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 4096) -> str:
        """Call DeepSeek-V3 via OpenRouter"""
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})
                
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "HTTP-Referer": "https://wikiask.io",
                        "X-Title": "WikiAsk AI",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "deepseek/deepseek-chat", # V3 par défaut maintenant
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": max_tokens
                    }
                )
                
                if response.status_code == 200:
                    self.increment_usage()
                    return response.json()["choices"][0]["message"]["content"]
                else:
                    raise Exception(f"OpenRouter returned status {response.status_code}: {response.text[:200]}")
        
        except Exception as e:
            self.last_error = str(e)
            raise Exception(f"DeepSeek API error: {e}")


class OllamaProvider(AIProvider):
    """Ollama local provider (unlimited fallback)"""
    
    def __init__(self):
        super().__init__("ollama", priority=5, daily_quota=0)  # Unlimited
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        
        try:
            response = httpx.get(f"{self.base_url}/api/tags", timeout=2)
            if response.status_code == 200:
                self.available = True
                print("[OK] Ollama provider initialized (unlimited local)")
            else:
                self.available = False
                print("[WARN] Ollama not responding")
        except Exception as e:
            self.available = False
            print(f"[WARN] Ollama not available: {e}")
    
    @circuit_breaker(name="ollama")
    async def call(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Call Ollama API"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                payload = {
                    "model": "llama3.1",
                    "prompt": prompt,
                    "stream": False
                }
                
                if system_prompt:
                    payload["system"] = system_prompt
                
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json=payload
                )
                
                if response.status_code == 200:
                    self.increment_usage()
                    return response.json()["response"]
                else:
                    raise Exception(f"Ollama returned status {response.status_code}")
        
        except Exception as e:
            self.last_error = str(e)
            raise Exception(f"Ollama API error: {e}")


class AIRouter:
    """Intelligent router for multiple AI providers with quota management"""
    
    def __init__(self):
        # Initialize providers in priority order
        # DEEPSEEK (V3) FIRST - Best performance/price ratio
        # CLAUDE SECOND - Most reliable backup
        # Mistral third - stable, fast
        self.providers = [
            OpenRouterProvider(),    # Priority 0: DeepSeek-V3 (Master)
            ClaudeProvider(),        # Priority 1: Claude Haiku (Backup premium)
            MistralProvider(),       # Priority 2: 1B tokens/month, STABLE
            GroqProvider(),          # Priority 3: Ultra-fast but rate-limited
            GeminiProvider(),        # Priority 4: 1,500/day
            OllamaProvider(),        # Priority 5: Unlimited local
        ]
        
        # Filter only available providers
        self.available_providers = [p for p in self.providers if p.available]
        
        if not self.available_providers:
            print("[ERROR] No AI providers available!")
        else:
            print(f"[OK] AI Router ready with {len(self.available_providers)} provider(s)")
            print(f"   Total daily quota: {sum(p.daily_quota for p in self.available_providers if p.daily_quota > 0)} + unlimited")
    
    async def route(
        self, 
        prompt: str, 
        system_prompt: Optional[str] = None,
        preferred_provider: Optional[str] = None,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """
        Route request to best available provider based on quotas
        Returns: {response: str, source: str, processing_time_ms: float, quota_remaining: int}
        """
        if not self.available_providers:
            raise Exception("No AI providers available")
        

        start_time = time.time()
        
        # ANTI-HALLUCINATION: Enhance system prompt automatically
        try:
            from services.anti_hallucination import enhance_system_prompt_anti_hallucination
            # Detect language from prompt
            lang = "fr" if any(w in prompt.lower() for w in ["bonjour", "comment", "quoi", "pourquoi", "quel"]) else "en"
            system_prompt = enhance_system_prompt_anti_hallucination(system_prompt or "", lang)
        except ImportError:
            pass  # Fallback if module not available
        
        # Try preferred provider first if specified
        if preferred_provider:
            provider = next(
                (p for p in self.available_providers if p.name == preferred_provider),
                None
            )
            if provider and provider.can_handle_request():
                try:
                    # Enhance prompt with provider personality
                    local_system_prompt = enhance_for_provider(system_prompt or "", provider.name)

                    if provider.name == "groq":
                        response = await provider.call(prompt, local_system_prompt, max_tokens)
                    else:
                        response = await provider.call(prompt, local_system_prompt, max_tokens)
                        
                    processing_time = (time.time() - start_time) * 1000
                    return {
                        "response": response,
                        "source": provider.name,
                        "processing_time_ms": processing_time,
                        "quota_remaining": provider.daily_quota - provider.requests_today if provider.daily_quota > 0 else -1
                    }
                except Exception as e:
                    print(f"Preferred provider {preferred_provider} failed: {e}")
        
        # Try providers in priority order (only those with quota remaining)
        for provider in sorted(self.available_providers, key=lambda p: p.priority):
            if not provider.can_handle_request():
                print(f"[WARN] {provider.name} quota exhausted ({provider.requests_today}/{provider.daily_quota})")
                continue
            
            try:
                # Enhance prompt with provider personality
                local_system_prompt = enhance_for_provider(system_prompt or "", provider.name)

                if provider.name == "groq":
                    response = await provider.call(prompt, local_system_prompt, max_tokens)
                else:
                    response = await provider.call(prompt, local_system_prompt, max_tokens)
                    
                processing_time = (time.time() - start_time) * 1000
                
                return {
                    "response": response,
                    "source": provider.name,
                    "processing_time_ms": processing_time,
                    "quota_remaining": provider.daily_quota - provider.requests_today if provider.daily_quota > 0 else -1
                }
            
            except Exception as e:
                print(f"Provider {provider.name} failed: {e}")
                continue
        
        # All providers failed or exhausted
        raise Exception("All AI providers failed or quota exhausted")

    
    def get_status(self) -> Dict[str, Any]:
        """Get status of all providers with quota info"""
        return {
            provider.name: {
                "available": provider.available,
                "priority": provider.priority,
                "daily_quota": provider.daily_quota,
                "requests_today": provider.requests_today,
                "quota_remaining": provider.daily_quota - provider.requests_today if provider.daily_quota > 0 else -1,
                "last_error": provider.last_error
            }
            for provider in self.providers
        }


# Singleton instance
ai_router = AIRouter()
