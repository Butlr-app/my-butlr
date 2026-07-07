import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { SignatureCanvas } from '@/components/SignatureCanvas'
import { getContractByToken, signContractByToken, type Contract } from '@/lib/useSupabase'
import { Loader2, CheckCircle, FileText, AlertTriangle } from 'lucide-react'

export function ContractSigning() {
  const { token } = useParams<{ token: string }>()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [alreadySigned, setAlreadySigned] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [signerRole, setSignerRole] = useState('')
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return }
    getContractByToken(token).then(c => {
      if (!c) {
        setNotFound(true)
      } else if (c.status === 'signed' || c.status === 'archived') {
        setContract(c)
        setAlreadySigned(true)
      } else {
        setContract(c)
      }
      setLoading(false)
    })
  }, [token])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!signerName.trim()) errs.signerName = 'Name is required'
    if (!signerRole.trim()) errs.signerRole = 'Role is required'
    if (!signatureData) errs.signature = 'Please sign above'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSign = async () => {
    if (!contract || !token || !signatureData) return
    if (!validate()) return
    setSigning(true)
    try {
      await signContractByToken(token, signerName, signerRole, signatureData)
      setSigned(true)
    } catch (err) {
      setErrors({ submit: (err as Error).message })
    }
    setSigning(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-10 h-10 mx-auto text-warning mb-4" />
          <h1 className="text-lg font-bold mb-2">Contract Not Found</h1>
          <p className="text-sm text-muted-foreground">This signing link is invalid or has expired.</p>
        </Card>
      </div>
    )
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <CheckCircle className="w-10 h-10 mx-auto text-success mb-4" />
          <h1 className="text-lg font-bold mb-2">Contract Signed</h1>
          <p className="text-sm text-muted-foreground">Thank you, {signerName}. The contract has been signed successfully.</p>
        </Card>
      </div>
    )
  }

  if (alreadySigned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <CheckCircle className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-lg font-bold mb-2">Already Signed</h1>
          <p className="text-sm text-muted-foreground">This contract has already been signed.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 flex items-start justify-center">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">butlr</h1>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mt-1">Contract Signing</p>
        </div>

        <Card className="p-6">
          <div className="flex items-start gap-3 mb-6">
            <FileText className="w-5 h-5 mt-0.5 text-muted-foreground" />
            <div>
              <h2 className="text-base font-semibold">Contract Details</h2>
              <p className="text-sm text-muted-foreground mt-1">Please review the contract details before signing.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Guest</p>
              <p className="font-medium">{contract?.guest_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Property</p>
              <p className="font-medium">{contract?.property_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Type</p>
              <p className="font-medium capitalize">{contract?.type.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Date</p>
              <p className="font-medium">{contract?.date}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Status</p>
              <Badge variant="info">{contract?.status}</Badge>
            </div>
          </div>

          {contract?.document_url && (
            <div className="mt-4">
              <a href={contract.document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-info underline">
                View contract document
              </a>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold mb-4">Your Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Full Name"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                required
              />
              {errors.signerName && <p className="text-xs text-destructive mt-1">{errors.signerName}</p>}
            </div>
            <div>
              <Input
                label="Role / Title"
                value={signerRole}
                onChange={e => setSignerRole(e.target.value)}
                placeholder="e.g. Guest, Owner, Manager"
                required
              />
              {errors.signerRole && <p className="text-xs text-destructive mt-1">{errors.signerRole}</p>}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold mb-4">Signature</h2>
          <SignatureCanvas onSignatureChange={setSignatureData} />
          {errors.signature && <p className="text-xs text-destructive mt-2">{errors.signature}</p>}
        </Card>

        {errors.submit && (
          <Card className="p-4 border-destructive">
            <p className="text-sm text-destructive">{errors.submit}</p>
          </Card>
        )}

        <Button className="w-full" onClick={handleSign} disabled={signing}>
          {signing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Sign Contract
        </Button>
      </div>
    </div>
  )
}
