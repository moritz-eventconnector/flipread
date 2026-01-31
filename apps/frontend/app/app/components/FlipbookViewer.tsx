'use client'

import React, { useEffect, useRef, useState } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

// Type definitions for StPageFlip
declare global {
  interface Window {
    StPageFlip: any
    St?: {
      PageFlip?: any
    }
    PageFlip?: any
    pageFlip?: any
    stPageFlip?: any
    module?: {
      exports?: any
    }
  }
}

interface FlipbookViewerProps {
  project: {
    slug: string
    title: string
    can_download?: boolean
    pages: Array<{
      page_number: number
      image_url: string
      width: number
      height: number
    }>
    pages_json: {
      total_pages: number
      pages: Array<{
        page_number: number
        file: string
        width: number
        height: number
      }>
    }
  }
}

// Icon Components
const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const ZoomInIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
  </svg>
)

const ZoomOutIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
  </svg>
)

const GridIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
)

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
)

export function FlipbookViewer({ project }: FlipbookViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const flipbookRef = useRef<any>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [zoom, setZoom] = useState(1)
  const [showThumbnails, setShowThumbnails] = useState(false)
  const [showNavigation, setShowNavigation] = useState(true)
  const [magnifierActive, setMagnifierActive] = useState(false)
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0, mouseX: 0, mouseY: 0 })
  const [magnifierZoom, setMagnifierZoom] = useState(2)
  const [downloading, setDownloading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const hideNavigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Calculate dimensions based on first page
  const firstPage = project.pages_json?.pages?.[0]
  const pageWidth = firstPage?.width || 800
  const pageHeight = firstPage?.height || 600
  const aspectRatio = pageWidth / pageHeight

  const totalPages = project.pages_json?.total_pages || 0

  // Load StPageFlip library
  useEffect(() => {
    if (window.StPageFlip) {
      console.log('StPageFlip already available')
      setIsLoading(false)
      return
    }

    console.log('Loading StPageFlip library...')
    
    // Load from public/lib (local only, no CDN)
    // Try page-flip.browser.js first as it's the browser-compatible version
    const possibleSources = [
      '/lib/page-flip.browser.js',
      '/lib/js/page-flip.browser.js',
      '/lib/st-pageflip.min.js',
      '/lib/page-flip.js',
      '/lib/page-flip.browser.min.js',
      '/lib/js/st-pageflip.min.js'
    ]
    
    let currentIndex = 0
    let currentScript: HTMLScriptElement | null = null
    
    const tryLoad = () => {
      if (currentIndex >= possibleSources.length) {
        console.error('Failed to load StPageFlip library from all sources:', possibleSources)
        console.error('Please ensure the library files are in /public/lib/')
        setIsLoading(false)
        return
      }
      
      const src = possibleSources[currentIndex]
      console.log(`Trying to load StPageFlip from: ${src}`)
      
      // Remove previous script if exists
      if (currentScript) {
        currentScript.remove()
      }
      
      currentScript = document.createElement('script')
      currentScript.src = src
      currentScript.async = true
      currentScript.onload = () => {
        console.log(`Script loaded: ${src}`)
        // Wait a bit for StPageFlip to be available
        // The page-flip library may export in different ways
        setTimeout(() => {
          // Check various possible global names and export patterns
          let pageFlipClass: any = null
          
          // Try direct window properties (most common)
          // The page-flip library exports as St.PageFlip
          if (window.St && (window.St as any).PageFlip) {
            pageFlipClass = (window.St as any).PageFlip
            console.log('Found St.PageFlip on window')
          } else if (window.StPageFlip) {
            pageFlipClass = window.StPageFlip
            console.log('Found StPageFlip directly on window')
          } else if ((window as any).PageFlip) {
            pageFlipClass = (window as any).PageFlip
            console.log('Found PageFlip on window')
          } else if ((window as any).pageFlip) {
            pageFlipClass = (window as any).pageFlip
            console.log('Found pageFlip on window')
          } else if ((window as any).stPageFlip) {
            pageFlipClass = (window as any).stPageFlip
            console.log('Found stPageFlip on window')
          }
          
          // Try checking the script's global scope (some UMD modules attach to globalThis)
          if (!pageFlipClass && typeof (globalThis as any).StPageFlip !== 'undefined') {
            pageFlipClass = (globalThis as any).StPageFlip
            console.log('Found StPageFlip on globalThis')
          }
          
          // Try UMD/CommonJS exports (if library uses module.exports)
          if (!pageFlipClass && typeof (window as any).module !== 'undefined' && (window as any).module.exports) {
            const moduleExports = (window as any).module.exports
            if (moduleExports && (moduleExports.StPageFlip || moduleExports.default)) {
              pageFlipClass = moduleExports.StPageFlip || moduleExports.default
              console.log('Found StPageFlip in module.exports')
            }
          }
          
          // Try checking if it's exported via a factory function or constructor
          if (!pageFlipClass && typeof (window as any).StPageFlip === 'function') {
            pageFlipClass = (window as any).StPageFlip
            console.log('Found StPageFlip as function')
          }
          
          if (pageFlipClass) {
            // Store it as StPageFlip for consistency (so we can use window.StPageFlip everywhere)
            window.StPageFlip = pageFlipClass
            console.log('StPageFlip is now available (found as:', pageFlipClass.name || 'unknown', ')')
            setIsLoading(false)
          } else {
            // Debug: log what's actually available on window
            console.error(`StPageFlip not available after loading ${src}`)
            const relevantKeys = Object.keys(window).filter(k => 
              k.toLowerCase().includes('page') || 
              k.toLowerCase().includes('flip') ||
              k.toLowerCase().includes('stpage')
            )
            console.warn('Available window properties:', relevantKeys.length > 0 ? relevantKeys : 'none found')
            console.warn('Checking window object:', typeof window, 'StPageFlip type:', typeof (window as any).StPageFlip)
            console.warn('Trying to fetch script content to debug...')
            
            // Try to fetch the script content to see what it exports
            fetch(src)
              .then(res => res.text())
              .then(text => {
                // Look for export patterns in the first 500 chars
                const preview = text.substring(0, 500)
                console.warn('Script content preview:', preview)
                // Look for common export patterns
                if (preview.includes('StPageFlip')) {
                  console.warn('Script contains "StPageFlip" string')
                }
                if (preview.includes('window.StPageFlip')) {
                  console.warn('Script contains "window.StPageFlip" assignment')
                }
                if (preview.includes('global.StPageFlip')) {
                  console.warn('Script contains "global.StPageFlip" assignment')
                }
              })
              .catch(err => console.warn('Could not fetch script for debugging:', err))
            
            currentIndex++
            tryLoad()
          }
        }, 500) // Increased timeout to give library more time to initialize
      }
      currentScript.onerror = (error) => {
        console.warn(`Failed to load ${src}:`, error)
        currentIndex++
        tryLoad()
      }
      
      document.head.appendChild(currentScript)
    }
    
    tryLoad()
    
    // Timeout: if library doesn't load within 10 seconds, stop loading
    const timeout = setTimeout(() => {
      if (!window.StPageFlip) {
        console.error('Timeout: StPageFlip library did not load within 10 seconds')
        setIsLoading(false)
      }
    }, 10000)

    return () => {
      clearTimeout(timeout)
      // Cleanup scripts
      if (currentScript) {
        currentScript.remove()
      }
      const scripts = document.querySelectorAll('script[src*="page-flip"], script[src*="st-pageflip"]')
      scripts.forEach(s => s.remove())
    }
  }, [])

  // Prepare image URLs
  useEffect(() => {
    if (!project.pages_json || !project.pages_json.pages || project.pages_json.pages.length === 0) {
      return
    }

    const urls = project.pages_json.pages.map((page) => {
      const pageData = project.pages?.find(p => p.page_number === page.page_number)
      let imageUrl = pageData?.image_url
      
      if (!imageUrl) {
        const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || ''
        imageUrl = `${apiBase}/media/projects/${project.slug}/pages/${page.file}`
      }
      
      if (imageUrl && imageUrl.startsWith('http://')) {
        imageUrl = imageUrl.replace('http://', 'https://')
      }
      
      return imageUrl
    })

    setImageUrls(urls)
  }, [project.pages_json, project.pages, project.slug])

  // Get page from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const pageParam = urlParams.get('page')
    if (pageParam && project.pages_json?.total_pages) {
      const pageNum = parseInt(pageParam, 10)
      if (pageNum >= 1 && pageNum <= project.pages_json.total_pages) {
        setCurrentPage(pageNum - 1)
      }
    }
  }, [project.pages_json?.total_pages])

  // Initialize StPageFlip
  useEffect(() => {
    if (isLoading || !containerRef.current || imageUrls.length === 0) {
      return
    }

    // Get StPageFlip from window
    if (!window.StPageFlip) {
      console.error('StPageFlip is not available - library may not have loaded yet')
      // Set loading to false to show error state instead of infinite loading
      setIsLoading(false)
      return
    }
    
    console.log('Initializing StPageFlip with', imageUrls.length, 'pages')

    const container = containerRef.current
    if (!container) return

    // Calculate dimensions
    const maxWidth = Math.min(1200, window.innerWidth - 40)
    const maxHeight = Math.min(900, window.innerHeight - 200)
    const aspectRatio = pageWidth / pageHeight
    let width = maxWidth
    let height = Math.round(width / aspectRatio)
    
    if (height > maxHeight) {
      height = maxHeight
      width = Math.round(height * aspectRatio)
    }

    // Create flipbook instance
    const flipbook = new window.StPageFlip(container, {
      width: width,
      height: height,
      showCover: true,
      maxShadowOpacity: 0.5,
      flippingTime: 1000,
      usePortrait: aspectRatio < 1,
      startPage: currentPage,
      size: 'stretch',
      minWidth: 300,
      maxWidth: 1200,
      minHeight: 300,
      maxHeight: 900,
      drawShadow: true,
      autoSize: true,
      useMouseEvents: !magnifierActive,
      swipeDistance: 30,
    })

    flipbookRef.current = flipbook

    // Load pages using loadFromImages (correct API for page-flip library)
    // The method expects an array of image URLs (strings)
    flipbook.loadFromImages(imageUrls)

    // Handle page flip event
    flipbook.on('flip', (e: any) => {
      const newPage = e.data
      setCurrentPage(newPage)
      
      // Update URL
      const url = new URL(window.location.href)
      url.searchParams.set('page', (newPage + 1).toString())
      window.history.pushState({}, '', url.toString())
    })

    // Handle init event (when flipbook is ready)
    flipbook.on('init', () => {
      console.log('Flipbook initialized')
      if (currentPage > 0) {
        flipbook.turnToPage(currentPage)
      }
    })

    // Cleanup
    return () => {
      if (flipbook && typeof flipbook.destroy === 'function') {
        flipbook.destroy()
      }
    }
  }, [isLoading, imageUrls, pageWidth, pageHeight, project.pages_json, magnifierActive])

  // Navigate to page when currentPage changes externally
  useEffect(() => {
    if (flipbookRef.current && typeof flipbookRef.current.turnToPage === 'function') {
      flipbookRef.current.turnToPage(currentPage)
    }
  }, [currentPage])

  // Apply zoom
  useEffect(() => {
    if (!containerRef.current || !flipbookRef.current) return

    const container = containerRef.current
    container.style.transform = `scale(${zoom})`
    container.style.transformOrigin = 'center center'
  }, [zoom])

  const goToPage = (pageIndex: number) => {
    if (pageIndex < 0 || pageIndex >= totalPages) return
    
    if (flipbookRef.current && typeof flipbookRef.current.flip === 'function') {
      flipbookRef.current.flip(pageIndex)
      setCurrentPage(pageIndex)
      const url = new URL(window.location.href)
      url.searchParams.set('page', (pageIndex + 1).toString())
      window.history.pushState({}, '', url.toString())
    } else {
      setCurrentPage(pageIndex)
    }
  }

  const flipNext = () => {
    if (!flipbookRef.current || currentPage >= totalPages - 1) return
    
    if (typeof flipbookRef.current.flipNext === 'function') {
      flipbookRef.current.flipNext()
    } else {
      const newPage = Math.min(currentPage + 1, totalPages - 1)
      goToPage(newPage)
    }
  }

  const flipPrev = () => {
    if (!flipbookRef.current || currentPage <= 0) return
    
    if (typeof flipbookRef.current.flipPrev === 'function') {
      flipbookRef.current.flipPrev()
    } else {
      const newPage = Math.max(currentPage - 1, 0)
      goToPage(newPage)
    }
  }

  const handleZoomIn = () => {
    setZoom((prev: number) => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev: number) => Math.max(prev - 0.25, 0.5))
  }

  const handleZoomReset = () => {
    setZoom(1)
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await api.get(`/projects/${project.slug}/download_pdf/`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${project.slug}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('PDF-Download gestartet')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Download')
    } finally {
      setDownloading(false)
    }
  }

  // Auto-hide navigation after inactivity
  useEffect(() => {
    const resetHideTimer = () => {
      setShowNavigation(true)
      if (hideNavigationTimeoutRef.current) {
        clearTimeout(hideNavigationTimeoutRef.current)
      }
      hideNavigationTimeoutRef.current = setTimeout(() => {
        setShowNavigation(false)
      }, 3000)
    }

    resetHideTimer()

    const handleMouseMove = () => {
      resetHideTimer()
    }

    const handleMouseLeave = () => {
      if (hideNavigationTimeoutRef.current) {
        clearTimeout(hideNavigationTimeoutRef.current)
      }
      setShowNavigation(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      if (hideNavigationTimeoutRef.current) {
        clearTimeout(hideNavigationTimeoutRef.current)
      }
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        flipPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        flipNext()
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        handleZoomIn()
      } else if (e.key === '-') {
        e.preventDefault()
        handleZoomOut()
      } else if (e.key === '0') {
        e.preventDefault()
        handleZoomReset()
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        setMagnifierActive(!magnifierActive)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages, magnifierActive])

  // Handle magnifier mouse move
  const handleMagnifierMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!magnifierActive || !containerRef.current) return

    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Check if mouse is over the container
    if (mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height) {
      // Calculate relative position (0-100%)
      const relativeX = (mouseX / rect.width) * 100
      const relativeY = (mouseY / rect.height) * 100

      setMagnifierPosition({
        x: relativeX,
        y: relativeY,
        mouseX: e.clientX,
        mouseY: e.clientY,
      })
    } else {
      setMagnifierPosition({ x: 0, y: 0, mouseX: 0, mouseY: 0 })
    }
  }

  if (!project.pages_json || !project.pages_json.pages || project.pages_json.pages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <p className="text-red-600 mb-4 text-lg">Fehler: Projekt-Daten sind unvollständig</p>
        </div>
      </div>
    )
  }

  if (isLoading || imageUrls.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Lädt Flipbook...</p>
          {typeof window !== 'undefined' && !window.StPageFlip && (
            <p className="text-sm text-gray-500 mt-2">
              Bibliothek wird geladen... Falls dies länger dauert, prüfen Sie die Browser-Konsole.
            </p>
          )}
        </div>
      </div>
    )
  }
  
  // Show error if library is not available but loading is done
  if (!isLoading && imageUrls.length > 0 && typeof window !== 'undefined' && !window.StPageFlip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4 text-lg font-semibold">Fehler beim Laden der Flipbook-Bibliothek</p>
          <p className="text-gray-600 mb-2">Die StPageFlip-Bibliothek konnte nicht geladen werden.</p>
          <p className="text-sm text-gray-500 mb-4">Bitte prüfen Sie die Browser-Konsole für weitere Details.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Seite neu laden
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div 
        className="w-full h-screen flex flex-col bg-gray-50 relative"
        style={{ 
          width: '100%', 
          height: '100vh', 
          overflow: 'hidden', 
          margin: 0, 
          padding: 0 
        }}
      >
      {/* Top Toolbar */}
      <div className="relative z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm h-16 flex items-center flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3 w-full">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900 truncate max-w-xs">
              {project.title}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Verkleinern (Strg + -)"
              >
                <ZoomOutIcon className="w-5 h-5 text-gray-700" />
              </button>
              <span className="px-3 py-1 text-sm font-medium text-gray-700 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Vergrößern (Strg + +)"
              >
                <ZoomInIcon className="w-5 h-5 text-gray-700" />
              </button>
              {zoom !== 1 && (
                <button
                  onClick={handleZoomReset}
                  className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                  title="Zoom zurücksetzen (0)"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Magnifier Toggle */}
            <button
              onClick={() => setMagnifierActive(!magnifierActive)}
              className={`p-2 rounded-lg transition-colors ${
                magnifierActive 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Lupe aktivieren (M) - Hovern Sie über die Seite zum Zoomen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="p-2 rounded-lg transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="PDF herunterladen"
            >
              <DownloadIcon className="w-5 h-5" />
            </button>

            {/* Thumbnail Toggle */}
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`p-2 rounded-lg transition-colors ${
                showThumbnails 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Seitenübersicht"
            >
              <GridIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Magnifier Lens */}
      {magnifierActive && imageUrls[currentPage] && magnifierPosition.mouseX > 0 && magnifierPosition.mouseY > 0 && (
        <div
          className="magnifier-lens fixed pointer-events-none z-[1000]"
          style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            border: '3px solid white',
            boxShadow: '0 0 20px rgba(0,0,0,0.5), 0 0 40px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            backgroundImage: `url(${imageUrls[currentPage]})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${100 / magnifierZoom}%`,
            backgroundPosition: `${magnifierPosition.x}% ${magnifierPosition.y}%`,
            display: 'block',
            left: `${magnifierPosition.mouseX - 100}px`,
            top: `${magnifierPosition.mouseY - 100}px`,
            transition: 'none',
            cursor: 'none',
            transform: 'translateZ(0)',
            willChange: 'transform'
          }}
        />
      )}

      {/* Main Content Area */}
      <div 
        className="flex-1 flex items-center justify-center"
        style={{ 
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          margin: 0,
          padding: 0,
          position: 'relative'
        }}
        onMouseMove={handleMagnifierMove}
      >
        <div 
          ref={containerRef}
          className="flipbook-wrapper"
          style={{ 
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            margin: 0,
            padding: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            transition: 'transform 0.3s ease'
          }}
        />
      </div>

      {/* Floating Navigation Buttons */}
      <div 
        className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ${
          showNavigation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        onMouseEnter={() => setShowNavigation(true)}
        onMouseLeave={() => {
          if (hideNavigationTimeoutRef.current) {
            clearTimeout(hideNavigationTimeoutRef.current)
          }
          hideNavigationTimeoutRef.current = setTimeout(() => {
            setShowNavigation(false)
          }, 2000)
        }}
      >
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-lg rounded-full px-4 py-2 shadow-xl border border-gray-200/50">
          {/* Previous Button */}
          <button
            onClick={flipPrev}
            disabled={currentPage === 0}
            className="p-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 disabled:hover:scale-100"
            title="Vorherige Seite (←)"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>

          {/* Page Info with Input */}
          <div className="flex items-center gap-1 px-3">
            <span className="text-sm text-gray-600">Seite</span>
            <input
              type="number"
              value={currentPage + 1}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const pageNum = parseInt(e.target.value, 10)
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                  goToPage(pageNum - 1)
                }
              }}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                const pageNum = parseInt(e.target.value, 10)
                if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
                  e.target.value = (currentPage + 1).toString()
                }
              }}
              min={1}
              max={totalPages}
              className="w-12 text-center bg-transparent border-b border-gray-300 text-lg font-bold text-gray-900 focus:outline-none focus:border-primary-500"
            />
            <span className="text-sm text-gray-600">von</span>
            <span className="text-lg font-bold text-gray-900">
              {totalPages}
            </span>
          </div>

          {/* Next Button */}
          <button
            onClick={flipNext}
            disabled={currentPage >= totalPages - 1}
            className="p-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 disabled:hover:scale-100"
            title="Nächste Seite (→)"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Thumbnail Sidebar */}
      {showThumbnails && (
        <div className="absolute top-16 right-0 bottom-24 w-64 bg-white/95 backdrop-blur-md border-l border-gray-200 shadow-xl z-40 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Seitenübersicht</h3>
              <button
                onClick={() => setShowThumbnails(false)}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                title="Schließen"
              >
                <XIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {imageUrls.map((imageUrl, index) => (
                <button
                  key={index}
                  onClick={() => {
                    goToPage(index)
                    setShowThumbnails(false)
                  }}
                  className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    index === currentPage
                      ? 'border-primary-600 ring-2 ring-primary-300'
                      : 'border-gray-200 hover:border-primary-400'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={`Seite ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                      console.error(`Failed to load thumbnail for page ${index + 1}`)
                      e.currentTarget.src = '/placeholder-page.png'
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 text-center">
                    {index + 1}
                  </div>
                  {index === currentPage && (
                    <div className="absolute inset-0 bg-primary-600/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">✓</span>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
