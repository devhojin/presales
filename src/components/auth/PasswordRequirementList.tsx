import { Check, X } from 'lucide-react'
import { getPasswordRequirements } from '@/lib/password-policy'

interface PasswordRequirementListProps {
  password: string
  email?: string
}

export function PasswordRequirementList({ password, email }: PasswordRequirementListProps) {
  const requirements = getPasswordRequirements(password, email)
  const hasInput = password.length > 0

  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5" aria-live="polite">
      {requirements.map((item) => {
        const passed = hasInput && item.met
        const failed = hasInput && !item.met

        return (
          <span
            key={item.id}
            className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
              passed ? 'text-green-600' : failed ? 'text-red-500' : 'text-muted-foreground'
            }`}
          >
            {passed ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {item.label}
          </span>
        )
      })}
    </div>
  )
}
