import { supabase } from './supabase'

export interface SendContractEmailResult {
  sent: boolean
  signing_link: string
  expires_at?: string
  reason?: string
  error?: string
}

export async function sendContractEmail(args: {
  contractId: string
  toEmail: string
  guestName?: string
  propertyName?: string
  signingLink?: string
}): Promise<SendContractEmailResult> {
  const { data, error } = await supabase.functions.invoke('send-contract-email', {
    body: {
      contract_id: args.contractId,
      to_email: args.toEmail,
      guest_name: args.guestName,
      property_name: args.propertyName,
      signing_link: args.signingLink,
    },
  })

  if (error) {
    throw new Error(error.message || 'Failed to send contract email')
  }

  const result = data as SendContractEmailResult
  if (result.error) {
    throw new Error(result.error)
  }
  return result
}
