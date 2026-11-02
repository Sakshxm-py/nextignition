export type RoleName = 'founder' | 'expert' | 'investor';
export type PlanTier = 'free' | 'pro' | 'elite';

export const PLAN_FEATURES: Record<RoleName, Record<PlanTier, Record<string, any>>> = {
  founder: {
    free: {
      canUploadPitchDeck: false,
      canDirectMessage: false,
      expertConsultations: 0,
      canLiveChatStream: false,
      ignishaQueries: 5,
    },
    pro: {
      canUploadPitchDeck: true,
      canDirectMessage: true,
      expertConsultations: 2,
      canLiveChatStream: true,
      ignishaQueries: 30,
    },
    elite: {
      canUploadPitchDeck: true,
      canDirectMessage: true,
      expertConsultations: 'Unlimited',
      canLiveChatStream: true,
      ignishaQueries: 100,
    }
  },
  expert: {
    free: {
      maxConsultationsPerMonth: 0,
      canHostPaidWebinars: false,
      canDirectMessage: false,
      ignishaQueries: 5,
    },
    pro: {
      maxConsultationsPerMonth: 10,
      canHostPaidWebinars: true,
      canDirectMessage: true,
      ignishaQueries: 30,
    },
    elite: {
      maxConsultationsPerMonth: 35,
      canHostPaidWebinars: true,
      canDirectMessage: true,
      ignishaQueries: 100,
    }
  },
  investor: {
    free: {
      advancedStartupFilters: false,
      pitchDeckAccess: false,
      directMessagingWithFounders: false,
      canDirectMessage: false,
      ignishaQueries: 5,
    },
    pro: {
      advancedStartupFilters: true,
      pitchDeckAccess: true,
      directMessagingWithFounders: true,
      canDirectMessage: true,
      ignishaQueries: 30,
    },
    elite: {
      advancedStartupFilters: true,
      pitchDeckAccess: true,
      directMessagingWithFounders: true,
      canDirectMessage: true,
      ignishaQueries: 100,
    }
  }
};
