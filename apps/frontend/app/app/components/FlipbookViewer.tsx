'use client'

import React, { useEffect, useRef, useState } from 'react'
import HTMLFlipBook from 'react-pageflip'

interface FlipbookViewerProps {
  project: {
    slug: string
    title: string
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
const Page = React.forwardRef<HTMLDivElement, { imageUrl: string; pageNumber: number; zoom: number }>(
  ({ imageUrl, pageNumber, zoom }, ref) => {
    return (
      <div ref={ref} className="page" style={{ width: '100%', height: '100%' }}>
        <div className="page-content" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`Seite ${pageNumber}`}
            style={{ 
              maxWidth: `${100 * zoom}%`, 
              maxHeight: `${100 * zoom}%`, 
              objectFit: 'contain',
              transition: 'transform 0.3s ease',
              transform: `scale(${zoom})`
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

export function FlipbookViewer({ project }: FlipbookViewerProps) {
  const flipBookRef = useRef<any>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [zoom, setZoom] = useState(1)
  const [showThumbnails, setShowThumbnails] = useState(false)

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
    if (flipBookRef.current) {
      try {
        const pageFlip = flipBookRef.current.getPageFlip?.()
        if (pageFlip && typeof pageFlip.turnToPage === 'function') {
          pageFlip.turnToPage(pageIndex)
          setCurrentPage(pageIndex)
          const url = new URL(window.location.href)
          url.searchParams.set('page', (pageIndex + 1).toString())
          window.history.pushState({}, '', url.toString())
        }
      } catch (error) {
        console.warn('FlipbookViewer: Could not navigate to page', error)
      }
    }
  }

  const flipNext = () => {
    if (flipBookRef.current && currentPage < totalPages - 1) {
      try {
        const pageFlip = flipBookRef.current.getPageFlip?.()
        if (pageFlip && typeof pageFlip.flipNext === 'function') {
          pageFlip.flipNext()
        }
      } catch (error) {
        console.warn('FlipbookViewer: Could not flip next', error)
      }
    }
  }

  const flipPrev = () => {
    if (flipBookRef.current && currentPage > 0) {
      try {
        const pageFlip = flipBookRef.current.getPageFlip?.()
        if (pageFlip && typeof pageFlip.flipPrev === 'function') {
          pageFlip.flipPrev()
        }
      } catch (error) {
        console.warn('FlipbookViewer: Could not flip prev', error)
      }
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
        }
      } catch (error) {
        console.warn('FlipbookViewer: Keyboard navigation error', error)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentPage, totalPages])

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

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center pt-16 pb-24 px-4 overflow-hidden">
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
            useMouseEvents={true}
            swipeDistance={30}
            showPageCorners={true}
            disableFlipByClick={false}
          >
            {imageUrls.map((imageUrl, index) => (
              <Page
                key={index}
                imageUrl={imageUrl}
                pageNumber={index + 1}
                zoom={zoom}
              />
            ))}
          </HTMLFlipBook>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center justify-between px-4 py-4">
          {/* Previous Button */}
          <button
            onClick={flipPrev}
            disabled={currentPage === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 disabled:transform-none shadow-md"
            title="Vorherige Seite (←)"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Zurück</span>
          </button>

          {/* Page Info */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Seite</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {currentPage + 1}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">von</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {totalPages}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-64 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all duration-300"
                style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
              />
            </div>
          </div>

          {/* Next Button */}
          <button
            onClick={flipNext}
            disabled={currentPage >= totalPages - 1}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 disabled:transform-none shadow-md"
            title="Nächste Seite (→)"
          >
            <span className="hidden sm:inline">Weiter</span>
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
                  className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
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
