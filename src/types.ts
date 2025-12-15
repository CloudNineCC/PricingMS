export type LodgingClass = 'HOSTEL' | 'STANDARD' | 'PREMIUM'

export type RateRow = {
  id: string
  city_id: string
  season_id: string
  lodging_class: LodgingClass
  base_nightly_usd: number
  notes?: string
}

export type FXSnapshot = {
  id: string
  as_of_date: string // ISO date
  base_currency: string
  quote_currency: string
  rate: number
}

export type TaxFee = {
  id: string
  city_id: string
  lodging_tax_pct?: number
  fixed_fee_usd?: number
}

export type Promo = {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  valid_from?: string
  valid_to?: string
}

export type QuoteSegmentInput = {
  city_id: string
  start_date: string
  end_date: string
  lodging_class: LodgingClass
}

export type Quote = {
  id: string
  currency: string
  total_usd: number
  per_segment: Array<{ segment: QuoteSegmentInput; nights: number; base_usd: number }>
  fx_used: FXSnapshot[]
  taxes_fees_applied: TaxFee[]
  promo_code?: string
}
