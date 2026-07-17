import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { PublicListing } from '@union-rental/shared';

type ContactContextValue = {
  openContact: (listing: Pick<PublicListing, 'id' | 'adresse' | 'prix'> | null) => void;
  contactListing: Pick<PublicListing, 'id' | 'adresse' | 'prix'> | null;
  isOpen: boolean;
  closeContact: () => void;
};

const ContactContext = createContext<ContactContextValue | null>(null);

export function ContactModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [contactListing, setContactListing] = useState<ContactContextValue['contactListing']>(null);

  const openContact = useCallback((listing: ContactContextValue['contactListing']) => {
    setContactListing(listing);
    setIsOpen(true);
  }, []);

  const closeContact = useCallback(() => {
    setIsOpen(false);
    setContactListing(null);
  }, []);

  return (
    <ContactContext.Provider value={{ openContact, contactListing, isOpen, closeContact }}>
      {children}
    </ContactContext.Provider>
  );
}

export function useContactModal() {
  const ctx = useContext(ContactContext);
  if (!ctx) throw new Error('useContactModal must be used within ContactModalProvider');
  return ctx;
}
