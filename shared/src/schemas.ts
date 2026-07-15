import { z } from 'zod';

export const publicListingsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  quartier: z.string().trim().max(80).optional(),
  taille: z.string().trim().max(10).optional(),
  prixMax: z.coerce.number().positive().max(100000).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

export const createLeadSchema = z
  .object({
    typeDemande: z.enum(['rappel', 'prequal']),
    listingId: z.string().uuid().nullish(),
    nom: z.string().trim().min(1).max(120),
    telephone: z
      .string()
      .trim()
      .min(1)
      .max(30)
      .refine((v) => v.replace(/\D/g, '').length >= 7, 'Téléphone invalide'),
    email: z.string().trim().email().max(120).nullish().or(z.literal('')),
    revenuMensuel: z.coerce.number().int().min(0).max(1000000).nullish(),
    scoreCredit: z.coerce.number().int().min(300).max(900).nullish(),
    dossierTal: z.boolean().nullish(),
    dateDemenagement: z.string().trim().max(60).nullish(),
    message: z.string().trim().max(2000).nullish(),
    refAgentId: z.string().uuid().nullish(),
    hp: z.string().max(200).optional().default(''),
    lang: z.enum(['fr', 'en']).optional().default('fr'),
  })
  .superRefine((d, ctx) => {
    if (d.typeDemande === 'prequal') {
      if (!d.email) {
        ctx.addIssue({ code: 'custom', path: ['email'], message: 'Email requis' });
      }
      if (d.revenuMensuel === null || d.revenuMensuel === undefined) {
        ctx.addIssue({ code: 'custom', path: ['revenuMensuel'], message: 'Revenu requis' });
      }
      if (d.scoreCredit === null || d.scoreCredit === undefined) {
        ctx.addIssue({ code: 'custom', path: ['scoreCredit'], message: 'Cote de crédit requise' });
      }
    }
  });

export type PublicListingsQuery = z.infer<typeof publicListingsQuerySchema>;
export type CreateLeadBody = z.infer<typeof createLeadSchema>;
