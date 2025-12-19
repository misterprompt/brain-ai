// Global Performance Optimizer - Netlify Edge Function
export default async (request, context) => {
  const url = new URL(request.url)
  const clientRegion = context.geo?.country?.code || 'US'
  const userAgent = request.headers.get('User-Agent') || ''

  // Add performance headers
  const response = await context.next()
  const newResponse = new Response(response.body, response)

  // Performance monitoring headers
  newResponse.headers.set('X-Client-Region', clientRegion)
  newResponse.headers.set('X-Edge-Location', context.serverRegion || 'unknown')
  newResponse.headers.set('X-Response-Time', Date.now().toString())

  // Optimize caching based on region and content type
  if (url.pathname.startsWith('/api/images/')) {
    // Images: Long cache, global CDN
    newResponse.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=7200')
    newResponse.headers.set('CDN-Cache-Control', 'max-age=3600')
    newResponse.headers.set('Vary', 'Accept-Encoding, X-Client-Region')
  } else if (url.pathname.startsWith('/api/games/')) {
    // Game data: Short cache, region-specific
    const cacheTime = clientRegion === 'US' ? 60 : 30 // US gets longer cache
    newResponse.headers.set('Cache-Control', `private, max-age=${cacheTime}`)
  } else if (url.pathname.includes('/claude/') || url.pathname.includes('/gnubg/')) {
    // AI services: Very short cache due to costs
    newResponse.headers.set('Cache-Control', 'private, max-age=10')
  }

  // Compression optimization
  if (!response.headers.get('Content-Encoding')) {
    newResponse.headers.set('Content-Encoding', 'gzip')
  }

  // Mobile optimization
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    newResponse.headers.set('X-Mobile-Optimized', 'true')
    // Could add mobile-specific optimizations here
  }

  return newResponse
}

export const config = {
  path: '/api/*'
}
