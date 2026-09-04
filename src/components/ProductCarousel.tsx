'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { Promotion } from '@/lib/types';

interface ProductCarouselProps {
  promotions: Promotion[];
}

const calculateDiscount = (p: Promotion) => {
  return p.product.discount || 0;
};

const formatRating = (rating: any): string => {
  const num = Number(rating);
  if (isNaN(num) || num <= 0) return '5.0';
  return num.toFixed(1);
};

const formatSales = (sales: any): string => {
  const num = Number(sales);
  if (isNaN(num) || num <= 0) return '100';
  return num.toLocaleString('pt-BR');
};

export default function ProductCarousel({ promotions }: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Triple the items to create a core for infinite looping
  const extendedPromotions = [...promotions, ...promotions, ...promotions];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth, scrollWidth } = scrollRef.current;
      const itemWidth = (clientWidth + 16) / 5;
      const sectionWidth = scrollWidth / 3;

      let nextScroll = direction === 'right' ? scrollLeft + itemWidth : scrollLeft - itemWidth;

      // Smooth scroll to the next position
      scrollRef.current.scrollTo({
        left: nextScroll,
        behavior: 'smooth'
      });

      // Seamless snap check after animation
      // We do it with a slight delay or by checking position during auto-scroll
    }
  };

  useEffect(() => {
    // Initial position: start of the middle section
    if (scrollRef.current && promotions.length > 0) {
      const sectionWidth = scrollRef.current.scrollWidth / 3;
      scrollRef.current.scrollLeft = sectionWidth;
    }
  }, [promotions]);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth } = scrollRef.current;
      const sectionWidth = scrollWidth / 3;

      // If we've scrolled into the third section, snap back to the second section
      if (scrollLeft >= sectionWidth * 2) {
        scrollRef.current.scrollLeft = scrollLeft - sectionWidth;
      }
      // If we've scrolled into the first section, snap forward to the second section
      else if (scrollLeft <= sectionWidth - scrollRef.current.clientWidth) {
         scrollRef.current.scrollLeft = scrollLeft + sectionWidth;
      }
    };

    const container = scrollRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [promotions]);

  useEffect(() => {
    if (isPaused || promotions.length === 0) return;

    const interval = setInterval(() => {
      scroll('right');
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused, promotions]);

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
        {extendedPromotions.map((p, idx) => {
          const discount = calculateDiscount(p);
          const originalPrice = p.product.originalPrice;
          
          return (
            <a 
              href={p.product.url || '#'} 
              key={`${p.id || p.product.url || 'promo'}-${idx}`} 
              className="carousel-item premium-card"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="premium-card-image">
                <img src={p.product.image} alt={p.product.title} />
                {discount > 0 && <div className="discount-badge">-{discount}% OFF</div>}
                <div className="card-store-circle-sm">
                   <img 
                    src={p.product.platform === 'amazon' ? '/logos/amazon.jpg' : 
                         p.product.platform === 'shopee' ? '/logos/shopee.jpg' : 
                         p.product.platform === 'mercadolivre' ? '/logos/mercadolivre.png' : '/logos/amazon.jpg'} 
                    alt={p.product.platform} 
                  />
                </div>
              </div>
              <div className="premium-card-body">
                 <div className="card-meta-row">
                    <div className="product-rating">
                       <span>★</span>
                       <span>{formatRating(p.product.rating)}</span>
                    </div>
                    <span className="product-sales">+{formatSales(p.product.sales)} vendidos</span>
                 </div>
                <h3 className="premium-card-title">{p.product.title}</h3>
                <div className="card-price-container">
                  {originalPrice && originalPrice > p.product.price && (
                    <div className="card-price-row old">
                      <span className="price-label">De:</span>
                      <span className="premium-card-old-price">
                        R$ {originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="card-price-row current">
                    <span className="price-label">Por:</span>
                    <span className="premium-card-price">
                      R$ {p.product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="btn btn-primary card-cta">
                   Ir para Loja
                </div>
              </div>
            </a>
          );
        })}
      </div>

      <button className="carousel-nav next" onClick={() => scroll('right')} aria-label="Próximo">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path></svg>
      </button>
    </div>
  );
}
