/**
 * DeleteAccountSection Component
 * 
 * Collapsible section for account deletion (App Store compliance requirement).
 * Hidden behind a chevron disclosure to keep it out of the way.
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Accordion variants matching QuickReorderModal bank dropdown
const ACCORDION_VARIANTS = {
  collapsed: { 
    height: 0, 
    opacity: 0,
    transition: { 
      height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.2 }
    }
  },
  open: { 
    height: "auto", 
    opacity: 1,
    transition: { 
      height: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.4, delay: 0.1 }
    }
  }
};

interface DeleteAccountSectionProps {
  onDelete: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteAccountSection({ onDelete, isDeleting }: DeleteAccountSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleDeleteClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    await onDelete();
    setShowConfirmDialog(false);
    setIsOpen(false);
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="overflow-hidden">
          <div className="w-full flex items-center justify-between gap-3">
            <CollapsibleTrigger asChild>
              <button className="flex-1 flex items-center justify-start text-left">
                <span className="text-sm font-semibold text-gray-900">Delete Account</span>
              </button>
            </CollapsibleTrigger>
            <div className="flex-shrink-0">
              <IconButton
                type="button"
                variant="default"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(!isOpen);
                }}
                aria-label={isOpen ? "Collapse" : "Expand"}
              >
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: "circOut" }}
                >
                  <ChevronDown className="w-5 h-5 text-slate-900" />
                </motion.div>
              </IconButton>
            </div>
          </div>

          <CollapsibleContent asChild>
            <motion.div
              variants={ACCORDION_VARIANTS}
              initial="collapsed"
              animate={isOpen ? "open" : "collapsed"}
              className="overflow-hidden"
              style={{ transform: "translateZ(0)" }}
            >
              <div className="pt-4 pb-4 space-y-4">
                <p className="text-sm text-slate-600">
                  This permanently deletes your account and signs you out. Completed orders may be retained for legal/compliance reasons.
                </p>
                <Button
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className="w-full h-14 text-white hover:opacity-90"
                  style={{ backgroundColor: '#E84855' }}
                >
                  {isDeleting ? "Deleting..." : "Delete Account"}
                </Button>
              </div>
            </motion.div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-slate-900">
              Delete account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              This action cannot be undone. Your account will be permanently deleted and you will be signed out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 sm:flex-col">
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="w-full h-14 text-white hover:opacity-90"
              style={{ backgroundColor: '#E84855' }}
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isDeleting}
              className="w-full h-14"
            >
              Cancel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

