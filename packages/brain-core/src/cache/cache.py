"""
Redis cache service for AI responses
With in-memory LRU cache fallback for local development
"""
import json
import hashlib
import time
from typing import Optional, Any, Dict
from redis import Redis
from redis.exceptions import RedisError
import os
from dotenv import load_dotenv
from collections import OrderedDict
import threading

load_dotenv()


class InMemoryCache:
    """Thread-safe in-memory LRU cache as Redis fallback"""
    
    def __init__(self, max_size: int = 500):
        self._cache: OrderedDict = OrderedDict()
        self._expiry: Dict[str, float] = {}
        self._max_size = max_size
        self._lock = threading.Lock()
    
    def get(self, key: str) -> Optional[str]:
        """Get value from cache"""
        with self._lock:
            if key not in self._cache:
                return None
            
            # Check expiry
            if key in self._expiry and time.time() > self._expiry[key]:
                del self._cache[key]
                del self._expiry[key]
                return None
            
            # Move to end (most recently used)
            self._cache.move_to_end(key)
            return self._cache[key]
    
    def setex(self, key: str, ttl: int, value: str):
        """Set value with TTL"""
        with self._lock:
            # Evict if at capacity
            while len(self._cache) >= self._max_size:
                oldest_key = next(iter(self._cache))
                del self._cache[oldest_key]
                if oldest_key in self._expiry:
                    del self._expiry[oldest_key]
            
            self._cache[key] = value
            self._expiry[key] = time.time() + ttl
    
    def delete(self, key: str):
        """Delete key"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
            if key in self._expiry:
                del self._expiry[key]
    
    def ping(self) -> bool:
        return True
    
    def incrby(self, key: str, amount: int) -> int:
        """Increment counter"""
        with self._lock:
            current = int(self._cache.get(key, "0"))
            new_val = current + amount
            self._cache[key] = str(new_val)
            return new_val
    
    def expire(self, key: str, ttl: int):
        """Set expiry on key"""
        with self._lock:
            if key in self._cache:
                self._expiry[key] = time.time() + ttl
    
    def pipeline(self):
        """Return self for pipeline operations"""
        return InMemoryPipeline(self)


class InMemoryPipeline:
    """Fake pipeline for memory cache"""
    def __init__(self, cache: InMemoryCache):
        self._cache = cache
        self._operations = []
    
    def incrby(self, key: str, amount: int):
        self._operations.append(('incrby', key, amount))
        return self
    
    def expire(self, key: str, ttl: int):
        self._operations.append(('expire', key, ttl))
        return self
    
    def execute(self):
        results = []
        for op in self._operations:
            if op[0] == 'incrby':
                results.append(self._cache.incrby(op[1], op[2]))
            elif op[0] == 'expire':
                self._cache.expire(op[1], op[2])
                results.append(True)
        return results


class CacheService:
    """Redis cache service with in-memory fallback"""
    
    def __init__(self):
        self.available = False
        self.redis = None
        self.using_memory = False
        
        # Try Redis first
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            try:
                self.redis = Redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
                self.redis.ping()
                self.available = True
                print("[OK] Redis cache connected (URL)")
                return
            except Exception as e:
                print(f"[WARN] Redis URL connection failed: {e}")
        
        # Try local Redis
        try:
            from redis.connection import ConnectionPool
            
            pool = ConnectionPool(
                host=os.getenv("REDIS_HOST", "localhost"),
                port=int(os.getenv("REDIS_PORT", 6379)),
                db=int(os.getenv("REDIS_DB", 0)),
                password=os.getenv("REDIS_PASSWORD") or None,
                max_connections=50,
                decode_responses=True,
                socket_connect_timeout=2
            )
            
            self.redis = Redis(connection_pool=pool)
            self.redis.ping()
            self.available = True
            print("[OK] Redis cache connected (local)")
        except (RedisError, Exception) as e:
            # Fallback to in-memory cache
            print(f"[INFO] Redis unavailable, using in-memory LRU cache (2000 entries)")
            self.redis = InMemoryCache(max_size=2000)
            self.available = True
            self.using_memory = True
    
    def _generate_key(self, prefix: str, data: str) -> str:
        """Generate cache key from data"""
        hash_obj = hashlib.md5(data.encode())
        return f"{prefix}:{hash_obj.hexdigest()}"
    
    def get(self, prefix: str, data: str) -> Optional[Any]:
        """Get cached value"""
        if not self.available:
            return None
        
        try:
            key = self._generate_key(prefix, data)
            cached = self.redis.get(key)
            if cached:
                return json.loads(cached)
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    def set(self, prefix: str, data: str, value: Any, ttl: int = 3600):
        """Set cached value with TTL"""
        if not self.available:
            return
        
        try:
            key = self._generate_key(prefix, data)
            self.redis.setex(
                key,
                ttl,
                json.dumps(value)
            )
        except Exception as e:
            print(f"Cache set error: {e}")
    
    def delete(self, prefix: str, data: str):
        """Delete cached value"""
        if not self.available:
            return
        
        try:
            key = self._generate_key(prefix, data)
            self.redis.delete(key)
        except Exception as e:
            print(f"Cache delete error: {e}")
    
    def health_check(self) -> bool:
        """Check if cache is healthy"""
        if not self.available:
            return False
        
        try:
            return self.redis.ping()
        except:
            return False

    # Quota Management Methods
    
    def _get_quota_key(self, provider: str) -> str:
        """Generate quota key for today"""
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        return f"quota:{provider}:{today}"

    def increment_quota_usage(self, provider: str, amount: int = 1) -> int:
        """Increment quota usage for a provider"""
        if not self.available:
            return 0
        
        try:
            key = self._get_quota_key(provider)
            # Increment and set expiry to 24h + buffer if new key
            pipe = self.redis.pipeline()
            pipe.incrby(key, amount)
            pipe.expire(key, 86400 * 2)  # Keep for 2 days just in case
            result = pipe.execute()
            return result[0]
        except Exception as e:
            print(f"Quota increment error: {e}")
            return 0

    def get_quota_usage(self, provider: str) -> int:
        """Get current quota usage for a provider"""
        if not self.available:
            return 0
        
        try:
            key = self._get_quota_key(provider)
            val = self.redis.get(key)
            return int(val) if val else 0
        except Exception as e:
            print(f"Quota get error: {e}")
            return 0

    def check_quota_available(self, provider: str, daily_quota: int) -> bool:
        """Check if quota is available"""
        if daily_quota == 0:  # Unlimited
            return True
            
        if not self.available:
            # Fallback to memory if Redis unavailable (handled in provider)
            return True
            
        current = self.get_quota_usage(provider)
        return current < daily_quota

    # Expert Response Caching (Granular & Sensitive)
    
    def get_expert_response(self, expert_id: str, session_id: str, message: str, is_sensitive: bool = False) -> Optional[Dict[str, Any]]:
        """
        Get cached expert response with sensitivity check.
        Key format: expert:{expert_id}:{session_id}:{hash(message)}
        """
        if not self.available or is_sensitive:
            return None
            
        try:
            # Create a unique key for this specific conversation state
            # We use MD5 of message to handle long messages
            msg_hash = hashlib.md5(message.encode()).hexdigest()
            key = f"expert:{expert_id}:{session_id}:{msg_hash}"
            
            cached = self.redis.get(key)
            if cached:
                return json.loads(cached)
            return None
        except Exception as e:
            print(f"Expert cache get error: {e}")
            return None

    def set_expert_response(self, expert_id: str, session_id: str, message: str, response_data: Dict[str, Any], is_sensitive: bool = False, ttl: int = 120):
        """
        Set cached expert response.
        TTL defaults to 2 minutes (120s) for general, can be overridden.
        """
        if not self.available or is_sensitive:
            return
            
        try:
            msg_hash = hashlib.md5(message.encode()).hexdigest()
            key = f"expert:{expert_id}:{session_id}:{msg_hash}"
            
            self.redis.setex(
                key,
                ttl,
                json.dumps(response_data)
            )
        except Exception as e:
            print(f"Expert cache set error: {e}")


# Singleton instance
cache_service = CacheService()
