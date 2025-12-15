import { z } from 'zod'

export const lodgingClassSchema = z.object({
  name: z.enum(['HOSTEL', 'STANDARD', 'PREMIUM'])
})

export const rateRowSchema = z.object({
  id: z.string().uuid().optional(),
  city_id: z.string(),
  season_id: z.string(),
  lodging_class: z.enum(['HOSTEL', 'STANDARD', 'PREMIUM']),
  base_nightly_usd: z.number().nonnegative(),
  notes: z.string().optional()
})

export const fxSnapshotSchema = z.object({
  id: z.string().uuid().optional(),
  as_of_date: z.string().date().or(z.string()),
  base_currency: z.string().length(3),
  quote_currency: z.string().length(3),
  rate: z.number().positive()
})

export const taxFeeSchema = z.object({
  id: z.string().uuid().optional(),
  city_id: z.string(),
  lodging_tax_pct: z.number().min(0).max(1).optional(),
  fixed_fee_usd: z.number().min(0).optional()
})

export const promoSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1),
  type: z.enum(['percent', 'fixed']),
  value: z.number().nonnegative(),
  valid_from: z.string().optional(),
  valid_to: z.string().optional()
})

export const quoteRequestSchema = z.object({
  segments: z
    .array(
      z.object({
        city_id: z.string(),
        start_date: z.string(),
        end_date: z.string(),
        lodging_class: z.enum(['HOSTEL', 'STANDARD', 'PREMIUM'])
      })
    )
    .min(1),
  currency: z.string().length(3).default('USD'),
  promo_code: z.string().optional()
})

export const optimizeRequestSchema = z.object({
  cities: z.array(z.object({ city_id: z.string(), nights: z.number().int().positive() })).min(1),
  objective: z.enum(['min_cost', 'min_travel_time'])
})
