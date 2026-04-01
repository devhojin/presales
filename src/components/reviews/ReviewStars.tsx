'use client'

import { Star } from 'lucide-react'

interface ReviewStarsProps {
  rating: number
  size?: number
  interactive?: boolean
  onChange?: (rating: number) => void
}

export function ReviewStars({ rating, size = 16, interactive = false, onChange }: ReviewStarsProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(i)}
          className={interactive ? 'hover:scale-110 transition-transform' : ''}
          style={{ cursor: interactive ? 'pointer' : 'default' }}
        >
          <Star
            style={{ width: size, height: size }}
            className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
          />
        </button>
      ))}
    </div>
  )
}
