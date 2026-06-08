"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  confirmText?: string
  loading?: boolean
}

export function ConfirmDialog({ open, onOpenChange, title, description, onConfirm, confirmText = "Confirmar", loading = false }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" disabled={loading} onClick={onConfirm}>{loading ? "Aguarde..." : confirmText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
