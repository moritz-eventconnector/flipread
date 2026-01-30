'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

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

export function FlipbookViewer({ project }: FlipbookViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [stPageFlipLoaded, setStPageFlipLoaded] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    // Get page from URL
    const urlParams = new URLSearchParams(window.location.search)
    const pageParam = urlParams.get('page')
    if (pageParam && project.pages_json && project.pages_json.total_pages) {
      const pageNum = parseInt(pageParam, 10)
      if (pageNum >= 1 && pageNum <= project.pages_json.total_pages) {
        setCurrentPage(pageNum)
      }
    }
  }, [project.pages_json?.total_pages])

  useEffect(() => {
    if (!stPageFlipLoaded || !containerRef.current || !project.pages_json || !project.pages_json.pages || project.pages_json.pages.length === 0) {
      console.log('FlipbookViewer: Waiting for data...', {
        stPageFlipLoaded,
        containerRef: !!containerRef.current,
        pages_json: !!project.pages_json,
        pages: project.pages_json?.pages?.length || 0
      })
      return
    }

    // Initialize StPageFlip
    const stPageFlip = (window as any).StPageFlip

    if (!stPageFlip) {
      console.error('FlipbookViewer: StPageFlip not loaded')
      return
    }

    // Calculate dimensions based on first page
    const firstPage = project.pages_json.pages[0]
    if (!firstPage) {
      console.error('FlipbookViewer: No first page found')
      return
    }
    
    const pageWidth = firstPage.width || 800
    const pageHeight = firstPage.height || 600
    const aspectRatio = pageWidth / pageHeight
    const baseWidth = 800
    const baseHeight = Math.round(baseWidth / aspectRatio)
    
    console.log('FlipbookViewer: Initializing with', {
      pages: project.pages_json.pages.length,
      firstPage: { width: pageWidth, height: pageHeight, aspectRatio },
      flipbookSize: { width: baseWidth, height: baseHeight }
    })

    const flipbook = new stPageFlip(containerRef.current, {
      width: baseWidth,
      height: baseHeight,
      showCover: true,
      maxShadowOpacity: 0.5,
      flippingTime: 1000,
      usePortrait: aspectRatio < 1,
      startPage: currentPage - 1,
    })

    // Load pages - StPageFlip expects array of objects with src, width, height
    const pages = project.pages_json.pages.map((page, index) => {
      const pageData = project.pages?.find(p => p.page_number === page.page_number)
      // Use absolute URL from API or construct from file path
      let imageUrl = pageData?.image_url
      
      // Fallback: construct URL from file path if image_url is not available
      if (!imageUrl) {
        const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || ''
        imageUrl = `${apiBase}/media/projects/${project.slug}/pages/${page.file}`
      }
      
      const pageObj = {
        src: imageUrl,
        width: page.width || 800,
        height: page.height || 600,
      }
      
      console.log(`FlipbookViewer: Page ${index + 1}`, pageObj)
      return pageObj
    })

    console.log('FlipbookViewer: Loading pages into StPageFlip', pages.length)
    flipbook.loadPages(pages)

    // Update URL when page changes
    flipbook.on('flip', (e: any) => {
      const newPage = e.data + 1
      setCurrentPage(newPage)
      const url = new URL(window.location.href)
      url.searchParams.set('page', newPage.toString())
      window.history.pushState({}, '', url.toString())
    })

    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        flipbook.flipPrev()
      } else if (e.key === 'ArrowRight') {
        flipbook.flipNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (flipbook && typeof flipbook.destroy === 'function') {
        flipbook.destroy()
      }
    }
  }, [stPageFlipLoaded, project.pages_json, project.pages, currentPage])

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/st-pageflip@latest/dist/st-pageflip.min.js"
        onLoad={() => setStPageFlipLoaded(true)}
      />
      <div className="w-full h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 relative">
        <div
          ref={containerRef}
          className="flipbook-container"
          style={{ width: '100%', height: '100%', maxWidth: '1200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        />
        {project.pages_json && project.pages_json.total_pages && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded z-10">
            Seite {currentPage} von {project.pages_json.total_pages}
          </div>
        )}
      </div>
    </>
  )
}

