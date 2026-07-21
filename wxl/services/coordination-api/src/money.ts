import { HttpError } from './types.js'

export type OrderBreakdown = {
  foodSubtotalCents: number
  deliveryCents: number
  handFeeCents: number
  subsidyCents: number
  taxCents: number
  tipCents: number
  totalCents: number
  providerAmountCents: number
  providerTopupCents: number
}

export function orderBreakdown(foodSubtotalCents: number, deliveryCents: number, subsidyCents: number, taxCents: number, tipCents: number): OrderBreakdown {
  const values = [foodSubtotalCents,deliveryCents,subsidyCents,taxCents,tipCents]
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) throw new HttpError(400, 'Payment amounts must be nonnegative integer cents', 'invalid_payment')
  const handFeeCents = Math.min(300,Math.round(foodSubtotalCents*0.05))
  if (subsidyCents>handFeeCents+deliveryCents) throw new HttpError(400,'Subsidy exceeds eligible fee and delivery charges','invalid_subsidy')
  return {
    foodSubtotalCents,deliveryCents,handFeeCents,subsidyCents,taxCents,tipCents,
    totalCents:foodSubtotalCents+deliveryCents+handFeeCents-subsidyCents+taxCents+tipCents,
    providerAmountCents:foodSubtotalCents+deliveryCents+taxCents+tipCents,
    providerTopupCents:Math.max(0,subsidyCents-handFeeCents),
  }
}
