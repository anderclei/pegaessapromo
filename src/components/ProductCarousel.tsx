'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { Promotion } from '@/lib/types';

interface ProductCarouselProps {
  promotions: Promotion[];
}

export default function ProductCarousel({ promotions }: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth, scrollWidth } = scrollRef.current;
      let scrollTo;
      
      if (direction === 'left') {
        scrollTo = scrollLeft - clientWidth * 0.8;
        if (scrollTo < -10) scrollTo = scrollWidth; // Loop to end
      } else {
        scrollTo = scrollLeft + clientWidth * 0.8;
        if (scrollLeft + clientWidth >= scrollWidth - 10) scrollTo = 0; // Loop to start
      }
      
      scrollRef.current.scrollTo({
        left: scrollTo,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      scroll('right');
    }, 3000); // Roda a cada 3 segundos

    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div 
      className="carousel-wrapper"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <button className="carousel-nav prev" onClick={() => scroll('left')} aria-label="Anterior">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path></svg>
      </button>
      
      <div className="carousel-container" ref={scrollRef}>
        {promotions.map((p) => (
          <Link href={`/p/${p.id}`} key={p.id} className="carousel-item">
            <div className="card-image-container">
              <img src={p.product.image} alt={p.product.title} />
              {p.product.discount && <span className="card-discount-badge">-{p.product.discount}%</span>}
              <div className="card-platform-badge">
                {p.product.platform === 'amazon' && <svg width="14" height="14" viewBox="0 0 256 256"><path d="M211.75,216.7c-47.88,27.08-119.62,27.08-167.5,0a8.08,8.08,0,0,1,0-13.4c47.88-27.08,119.62-27.08,167.5,0a8.08,8.08,0,0,1,0,13.4Z" fill="#ff9900"/></svg>}
              </div>
            </div>
            <div className="card-content">
              <div className="card-meta">há 3dias</div>
              <h3 className="card-title">{p.product.title}</h3>
              <div className="card-price-row">
                 <span className="card-price">R$ {p.product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z"></path></svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <button className="carousel-nav next" onClick={() => scroll('right')} aria-label="Próximo">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path></svg>
      </button>

      <style jsx>{`
        .carousel-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          margin-bottom: 2rem;
        }

        .carousel-container {
          display: flex;
          overflow-x: auto;
          gap: 1rem;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 0.5rem;
          scroll-behavior: smooth;
        }

        .carousel-container::-webkit-scrollbar {
          display: none;
        }

        .carousel-item {
          flex: 0 0 calc(25% - 0.75rem);
          min-width: 250px;
          scroll-snap-align: start;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .carousel-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .carousel-nav {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #ff4444;
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          box-shadow: 0 4px 12px rgba(255, 68, 68, 0.3);
          transition: all 0.2s;
        }

        .carousel-nav:hover {
          background: #e63939;
          transform: scale(1.1);
        }

        .carousel-nav.prev {
          left: -20px;
        }

        .carousel-nav.next {
          right: -20px;
        }

        .card-image-container {
          position: relative;
          aspect-ratio: 1;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .card-image-container img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .card-discount-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: #ff4444;
          color: white;
          font-size: 0.75rem;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .card-platform-badge {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .card-content {
          padding: 1rem;
        }

        .card-meta {
          font-size: 0.75rem;
          color: #666;
          margin-bottom: 0.5rem;
        }

        .card-title {
          font-size: 0.9rem;
          font-weight: 500;
          margin: 0 0 0.75rem 0;
          height: 2.4rem;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          line-height: 1.2;
        }

        .card-price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-price {
          font-weight: 700;
          font-size: 1.1rem;
          color: #000;
        }

        @media (max-width: 768px) {
          .carousel-item {
            flex: 0 0 70%;
            min-width: 200px;
          }
          .carousel-nav {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
