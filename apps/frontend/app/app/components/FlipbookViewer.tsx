'use client'

import React, { useEffect, useRef, useState } from 'react'
import HTMLFlipBook from 'react-pageflip'
import api from '@/lib/api'
import toast from 'react-hot-toast'

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

// Page component for react-pageflip (requires forwardRef)
const Page = React.forwardRef<HTMLDivElement, { 
  imageUrl: string
  pageNumber: number
  zoom: number
  magnifierActive: boolean
  onMagnifierMove: (x: number, y: number, mouseX: number, mouseY: number) => void
  magnifierZoom: number
}>(
  ({ imageUrl, pageNumber, zoom, magnifierActive, onMagnifierMove, magnifierZoom }, ref) => {
    const imgRef = useRef<HTMLImageElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!magnifierActive || !imgRef.current || !containerRef.current) return
      
      const containerRect = containerRef.current.getBoundingClientRect()
      const imgRect = imgRef.current.getBoundingClientRect()
      
      // Calculate mouse position relative to the image
      const mouseX = e.clientX - imgRect.left
      const mouseY = e.clientY - imgRect.top
      
      // Calculate relative position within the image (0-100%)
      const relativeX = (mouseX / imgRect.width) * 100
      const relativeY = (mouseY / imgRect.height) * 100
      
      // Clamp to image bounds
      const clampedX = Math.max(0, Math.min(100, relativeX))
      const clampedY = Math.max(0, Math.min(100, relativeY))
      
      onMagnifierMove(clampedX, clampedY, e.clientX, e.clientY)
    }

    return (
      <div 
        ref={ref} 
        className="page" 
        style={{ width: '100%', height: '100%', position: 'relative' }}
      >
        <div 
          ref={containerRef}
          className="page-content" 
          style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
          onMouseMove={handleMouseMove}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt={`Seite ${pageNumber}`}
            style={{ 
              maxWidth: `${100 * zoom}%`, 
              maxHeight: `${100 * zoom}%`, 
              objectFit: 'contain',
              transition: magnifierActive ? 'none' : 'transform 0.3s ease',
              transform: `scale(${zoom})`,
              cursor: magnifierActive ? 'none' : 'default'
            }}
            loading="lazy"
          />
        </div>
      </div>
    )
  }
)
Page.displayName = 'Page'

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
  const flipBookRef = useRef<any>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [zoom, setZoom] = useState(1)
  const [showThumbnails, setShowThumbnails] = useState(false)
  const [showNavigation, setShowNavigation] = useState(true)
  const [magnifierActive, setMagnifierActive] = useState(false)
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0, mouseX: 0, mouseY: 0 })
  const [magnifierZoom, setMagnifierZoom] = useState(2)
  const [downloading, setDownloading] = useState(false)
  const hideNavigationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate dimensions based on first page
  const firstPage = project.pages_json?.pages?.[0]
  const pageWidth = firstPage?.width || 800
  const pageHeight = firstPage?.height || 600
  const aspectRatio = pageWidth / pageHeight
  const baseWidth = 800
  const baseHeight = Math.round(baseWidth / aspectRatio)

  const totalPages = project.pages_json?.total_pages || 0

  // Prepare image URLs
  useEffect(() => {
    if (!project.pages_json || !project.pages_json.pages || project.pages_json.pages.length === 0) {
      return
    }

    const urls = project.pages_json.pages.map((page) => {
      const pageData = project.pages?.find(p => p.page_number === page.page_number)
      // Use absolute URL from API or construct from file path
      let imageUrl = pageData?.image_url
      
      // Fallback: construct URL from file path if image_url is not available
      if (!imageUrl) {
        const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || ''
        imageUrl = `${apiBase}/media/projects/${project.slug}/pages/${page.file}`
      }
      
      // Ensure HTTPS (fix Mixed Content warnings)
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
        setCurrentPage(pageNum - 1) // react-pageflip uses 0-based index
      }
    }
  }, [project.pages_json?.total_pages])

  // Navigate to initial page when flipbook is ready
  useEffect(() => {
    if (!flipBookRef.current || imageUrls.length === 0) return
    
    // Wait for component to be fully mounted and initialized
    const timer = setTimeout(() => {
      if (flipBookRef.current) {
        try {
          const pageFlip = flipBookRef.current.getPageFlip?.()
          if (pageFlip && typeof pageFlip.turnToPage === 'function' && currentPage > 0) {
            pageFlip.turnToPage(currentPage)
          }
        } catch (error) {
          console.warn('FlipbookViewer: Could not navigate to page', error)
        }
      }
    }, 500) // Increased delay to ensure component is ready
    
    return () => clearTimeout(timer)
  }, [currentPage, imageUrls.length])

  const handleFlip = (e: any) => {
    const newPage = e.data
    setCurrentPage(newPage)
    
    // Update URL
    const url = new URL(window.location.href)
    url.searchParams.set('page', (newPage + 1).toString())
    window.history.pushState({}, '', url.toString())
  }

  const goToPage = (pageIndex: number) => {
    if (pageIndex < 0 || pageIndex >= totalPages) return
    
    if (flipBookRef.current) {
      try {
        // Try multiple ways to access the pageFlip instance
        let pageFlip = null
        
        if (flipBookRef.current.pageFlip) {
          pageFlip = flipBookRef.current.pageFlip
        } else if (typeof flipBookRef.current.getPageFlip === 'function') {
          pageFlip = flipBookRef.current.getPageFlip()
        }
        
        if (pageFlip && typeof pageFlip.flip === 'function') {
          // Use flip method with page index
          pageFlip.flip(pageIndex)
          setCurrentPage(pageIndex)
          const url = new URL(window.location.href)
          url.searchParams.set('page', (pageIndex + 1).toString())
          window.history.pushState({}, '', url.toString())
        } else if (pageFlip && typeof pageFlip.turnToPage === 'function') {
          pageFlip.turnToPage(pageIndex)
          setCurrentPage(pageIndex)
          const url = new URL(window.location.href)
          url.searchParams.set('page', (pageIndex + 1).toString())
          window.history.pushState({}, '', url.toString())
        } else {
          // Fallback: directly update state
          setCurrentPage(pageIndex)
          const url = new URL(window.location.href)
          url.searchParams.set('page', (pageIndex + 1).toString())
          window.history.pushState({}, '', url.toString())
        }
      } catch (error) {
        console.error('FlipbookViewer: Could not navigate to page', error)
        // Fallback: directly update state
        setCurrentPage(pageIndex)
      }
    } else {
      // Fallback: directly update state if ref is not available
      setCurrentPage(pageIndex)
    }
  }

  const flipNext = () => {
    if (!flipBookRef.current || currentPage >= totalPages - 1) return
    
    try {
      // react-pageflip: The ref directly exposes the pageFlip instance methods
      if (flipBookRef.current && typeof flipBookRef.current.pageFlip === 'object') {
        const pageFlip = flipBookRef.current.pageFlip
        if (pageFlip && typeof pageFlip.flipNext === 'function') {
          pageFlip.flipNext()
        }
      } else if (flipBookRef.current && typeof flipBookRef.current.flipNext === 'function') {
        // Alternative: direct method on ref
        flipBookRef.current.flipNext()
      } else if (flipBookRef.current && typeof flipBookRef.current.getPageFlip === 'function') {
        // Fallback: getPageFlip method
        const pageFlip = flipBookRef.current.getPageFlip()
        if (pageFlip && typeof pageFlip.flipNext === 'function') {
          pageFlip.flipNext()
        }
      } else {
        // Last resort: try to navigate programmatically
        const newPage = Math.min(currentPage + 1, totalPages - 1)
        goToPage(newPage)
      }
    } catch (error) {
      console.error('FlipbookViewer: Error flipping next', error)
      // Fallback: navigate directly
      const newPage = Math.min(currentPage + 1, totalPages - 1)
      goToPage(newPage)
    }
  }

  const flipPrev = () => {
    if (!flipBookRef.current || currentPage <= 0) return
    
    try {
      // react-pageflip: The ref directly exposes the pageFlip instance methods
      if (flipBookRef.current && typeof flipBookRef.current.pageFlip === 'object') {
        const pageFlip = flipBookRef.current.pageFlip
        if (pageFlip && typeof pageFlip.flipPrev === 'function') {
          pageFlip.flipPrev()
        }
      } else if (flipBookRef.current && typeof flipBookRef.current.flipPrev === 'function') {
        // Alternative: direct method on ref
        flipBookRef.current.flipPrev()
      } else if (flipBookRef.current && typeof flipBookRef.current.getPageFlip === 'function') {
        // Fallback: getPageFlip method
        const pageFlip = flipBookRef.current.getPageFlip()
        if (pageFlip && typeof pageFlip.flipPrev === 'function') {
          pageFlip.flipPrev()
        }
      } else {
        // Last resort: try to navigate programmatically
        const newPage = Math.max(currentPage - 1, 0)
        goToPage(newPage)
      }
    } catch (error) {
      console.error('FlipbookViewer: Error flipping prev', error)
      // Fallback: navigate directly
      const newPage = Math.max(currentPage - 1, 0)
      goToPage(newPage)
    }
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5))
  }

  const handleZoomReset = () => {
    setZoom(1)
  }

  const handleDownload = async () => {
    if (!project.can_download) {
      // Redirect to download purchase page
      window.location.href = `/app/projects/${project.slug}/download`
      return
    }

    setDownloading(true)
    try {
      // Download the original PDF file
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
      if (error.response?.status === 402) {
        // Payment required - redirect to purchase page
        window.location.href = `/app/projects/${project.slug}/download`
      } else {
        toast.error(error.response?.data?.error || 'Fehler beim Download')
      }
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
      }, 3000) // Hide after 3 seconds of inactivity
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
      if (!flipBookRef.current) return
      
      // Don't handle keyboard if user is typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return
      }
      
      try {
        const pageFlip = flipBookRef.current.getPageFlip?.()
        if (!pageFlip || typeof pageFlip.flipPrev !== 'function') return

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
      } catch (error) {
        console.warn('FlipbookViewer: Keyboard navigation error', error)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages, magnifierActive])

  if (!project.pages_json || !project.pages_json.pages || project.pages_json.pages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4 text-lg">Fehler: Projekt-Daten sind unvollständig</p>
        </div>
      </div>
    )
  }

  if (imageUrls.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Lädt Flipbook...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 relative overflow-hidden">
      {/* Top Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-xs">
              {project.title}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Verkleinern (Strg + -)"
              >
                <ZoomOutIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
              <span className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Vergrößern (Strg + +)"
              >
                <ZoomInIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
              {zoom !== 1 && (
                <button
                  onClick={handleZoomReset}
                  className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
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
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
              className={`p-2 rounded-lg transition-colors ${
                project.can_download
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={project.can_download ? 'PDF herunterladen' : 'Download kaufen'}
            >
              <DownloadIcon className="w-5 h-5" />
            </button>

            {/* Thumbnail Toggle */}
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`p-2 rounded-lg transition-colors ${
                showThumbnails 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
            // Calculate background size: image should be magnified by magnifierZoom factor
            // backgroundSize in %: 100% = original size, 50% = 2x zoom, 33% = 3x zoom
            // For a 2x zoom, we want the image to be 50% of its original size in the lens
            backgroundSize: `${100 / magnifierZoom}%`,
            // Background position: Center the magnified area on the mouse position
            // The position needs to be adjusted to account for the lens size
            // When backgroundSize is 50% (2x zoom), we need to offset by half the lens size
            // Formula: position = mousePosition% - (lensSize / (imageSize * zoomFactor) * 100
            // For a 200px lens with 2x zoom on an 800px image:
            // offset = (200 / (800 * 2)) * 100 = 12.5%
            // So position = mouseX% - 12.5%
            backgroundPosition: `${magnifierPosition.x}% ${magnifierPosition.y}%`,
            display: 'block',
            left: `${magnifierPosition.mouseX - 100}px`,
            top: `${magnifierPosition.mouseY - 100}px`,
            transition: 'none',
            cursor: 'none',
            transform: 'translateZ(0)', // Force hardware acceleration
            willChange: 'transform' // Optimize for animation
          }}
        />
      )}

      {/* Main Content Area */}
      <div 
        className="flex-1 flex items-center justify-center pt-16 pb-24 px-4 overflow-hidden"
        onMouseMove={(e) => {
          if (magnifierActive && imageUrls[currentPage]) {
            // Find the actual page image element within the flipbook
            const flipbookContainer = document.querySelector('.flipbook-container')
            if (!flipbookContainer) return
            
            // Try to find the current page's image
            const pageElements = flipbookContainer.querySelectorAll('.page img, .page-content img, img')
            let currentPageImg: HTMLImageElement | null = null
            
            // Get the visible page image (react-pageflip shows two pages at a time)
            for (let i = 0; i < pageElements.length; i++) {
              const img = pageElements[i] as HTMLImageElement
              const rect = img.getBoundingClientRect()
              // Check if mouse is over this image
              if (e.clientX >= rect.left && e.clientX <= rect.right && 
                  e.clientY >= rect.top && e.clientY <= rect.bottom) {
                currentPageImg = img
                break
              }
            }
            
            // Fallback: use first visible image if none found
            if (!currentPageImg && pageElements.length > 0) {
              currentPageImg = pageElements[0] as HTMLImageElement
            }
            
            if (currentPageImg) {
              const imgRect = currentPageImg.getBoundingClientRect()
              const mouseX = e.clientX - imgRect.left
              const mouseY = e.clientY - imgRect.top
              
              // Check if mouse is over the image
              if (mouseX >= 0 && mouseX <= imgRect.width && mouseY >= 0 && mouseY <= imgRect.height) {
                // Calculate relative position within the image (0-100%)
                const relativeX = (mouseX / imgRect.width) * 100
                const relativeY = (mouseY / imgRect.height) * 100
                
                setMagnifierPosition({ 
                  x: relativeX, 
                  y: relativeY, 
                  mouseX: e.clientX, 
                  mouseY: e.clientY 
                })
              } else {
                // Hide magnifier if outside image
                setMagnifierPosition({ x: 0, y: 0, mouseX: 0, mouseY: 0 })
              }
            }
          }
        }}
      >
        <div className="flipbook-wrapper w-full h-full flex justify-center items-center">
          <HTMLFlipBook
            ref={flipBookRef}
            width={baseWidth}
            height={baseHeight}
            size="stretch"
            minWidth={400}
            maxWidth={1200}
            minHeight={300}
            maxHeight={900}
            maxShadowOpacity={0.5}
            showCover={true}
            flippingTime={1000}
            usePortrait={aspectRatio < 1}
            mobileScrollSupport={true}
            onFlip={handleFlip}
            className="flipbook-container"
            style={{}}
            startPage={currentPage}
            drawShadow={true}
            startZIndex={0}
            autoSize={true}
            clickEventForward={true}
            useMouseEvents={!magnifierActive}
            swipeDistance={30}
            showPageCorners={true}
            disableFlipByClick={magnifierActive}
          >
            {imageUrls.map((imageUrl, index) => (
              <Page
                key={index}
                imageUrl={imageUrl}
                pageNumber={index + 1}
                zoom={zoom}
                magnifierActive={magnifierActive}
                onMagnifierMove={(relX, relY, mouseX, mouseY) => {
                  setMagnifierPosition({ x: relX, y: relY, mouseX, mouseY })
                }}
                magnifierZoom={magnifierZoom}
              />
            ))}
          </HTMLFlipBook>
        </div>
      </div>

      {/* Floating Navigation Buttons - Subtle and Auto-hide */}
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
        <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-full px-4 py-2 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
          {/* Previous Button */}
          <button
            onClick={flipPrev}
            disabled={currentPage === 0}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 disabled:hover:scale-100"
            title="Vorherige Seite (←)"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>

          {/* Page Info with Input */}
          <div className="flex items-center gap-1 px-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">Seite</span>
            <input
              type="number"
              value={currentPage + 1}
              onChange={(e) => {
                const pageNum = parseInt(e.target.value, 10)
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                  goToPage(pageNum - 1)
                }
              }}
              onBlur={(e) => {
                // On blur, if input is empty or invalid, revert to current page
                const pageNum = parseInt(e.target.value, 10)
                if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
                  e.target.value = (currentPage + 1).toString()
                }
              }}
              min={1}
              max={totalPages}
              className="w-12 text-center bg-transparent border-b border-gray-300 dark:border-gray-600 text-lg font-bold text-gray-900 dark:text-white focus:outline-none focus:border-primary-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">von</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {totalPages}
            </span>
          </div>

          {/* Next Button */}
          <button
            onClick={flipNext}
            disabled={currentPage >= totalPages - 1}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 disabled:hover:scale-100"
            title="Nächste Seite (→)"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Thumbnail Sidebar */}
      {showThumbnails && (
        <div className="absolute top-16 right-0 bottom-24 w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-l border-gray-200 dark:border-gray-700 shadow-xl z-40 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Seitenübersicht</h3>
              <button
                onClick={() => setShowThumbnails(false)}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Schließen"
              >
                <XIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
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
                      ? 'border-primary-600 ring-2 ring-primary-300 dark:ring-primary-800'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-600'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={`Seite ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
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
  )
}
