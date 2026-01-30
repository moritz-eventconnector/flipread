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
const Page = React.forwardRef<HTMLDivElement, { imageUrl: string; pageNumber: number }>(
  ({ imageUrl, pageNumber }, ref) => {
    return (
      <div ref={ref} className="page" style={{ width: '100%', height: '100%' }}>
        <div className="page-content" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`Seite ${pageNumber}`}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            loading="lazy"
          />
        </div>
      </div>
    )
  }
)
Page.displayName = 'Page'

export function FlipbookViewer({ project }: FlipbookViewerProps) {
  const flipBookRef = useRef<any>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [imageUrls, setImageUrls] = useState<string[]>([])

  // Calculate dimensions based on first page
  const firstPage = project.pages_json?.pages?.[0]
  const pageWidth = firstPage?.width || 800
  const pageHeight = firstPage?.height || 600
  const aspectRatio = pageWidth / pageHeight
  const baseWidth = 800
  const baseHeight = Math.round(baseWidth / aspectRatio)

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
    if (flipBookRef.current && currentPage > 0) {
      const pageFlip = flipBookRef.current.getPageFlip()
      if (pageFlip) {
        // Small delay to ensure flipbook is fully initialized
        setTimeout(() => {
          pageFlip.turnToPage(currentPage)
        }, 100)
      }
    }
  }, [currentPage, imageUrls.length])

  const handleFlip = (e: any) => {
    const newPage = e.data
    setCurrentPage(newPage)
    
    // Update URL
    const url = new URL(window.location.href)
    url.searchParams.set('page', (newPage + 1).toString())
    window.history.pushState({}, '', url.toString())
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!flipBookRef.current) return
      
      const pageFlip = flipBookRef.current.getPageFlip()
      if (!pageFlip) return

      if (e.key === 'ArrowLeft') {
        pageFlip.flipPrev()
      } else if (e.key === 'ArrowRight') {
        pageFlip.flipNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  if (!project.pages_json || !project.pages_json.pages || project.pages_json.pages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Fehler: Projekt-Daten sind unvollständig</p>
        </div>
      </div>
    )
  }

  if (imageUrls.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Lädt Flipbook...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 relative">
      <div className="flipbook-wrapper" style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
            />
          ))}
        </HTMLFlipBook>
      </div>
      {project.pages_json && project.pages_json.total_pages && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded z-10">
          Seite {currentPage + 1} von {project.pages_json.total_pages}
        </div>
      )}
    </div>
  )
}
