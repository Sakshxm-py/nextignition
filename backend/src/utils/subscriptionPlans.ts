export type RoleName = 'founder' | 'expert' | 'investor';
export type PlanTier = 'free' | 'pro' | 'elite';
export type BillingCycle = 'monthly' | 'annual';

// Pricing in INR (not paise here, we convert to paise in controller)
// NOTE: Elite plan is CURRENTLY COMING SOON and not yet live.
export const PLAN_PRICING: Record<RoleName, Record<PlanTier, Record<BillingCycle, number>>> = {
  founder: {
    free: { monthly: 0, annual: 0 },
    pro: { monthly: 999, annual: Math.floor(999 * 12 * 0.83) }, // ~17% off
    elite: { monthly: 2999, annual: Math.floor(2999 * 12 * 0.83) }
  },
  expert: {
    free: { monthly: 0, annual: 0 },
    pro: { monthly: 999, annual: Math.floor(999 * 12 * 0.83) },
    elite: { monthly: 1999, annual: Math.floor(1999 * 12 * 0.83) }
  },
  investor: {
    free: { monthly: 0, annual: 0 },
    pro: { monthly: 2999, annual: Math.floor(2999 * 12 * 0.83) },
    elite: { monthly: 4999, annual: Math.floor(4999 * 12 * 0.83) }
  }
};

export const getPrice = (role: RoleName, plan: PlanTier, cycle: BillingCycle): number => {
  return PLAN_PRICING[role][plan][cycle];
};

export const getBundlePrice = (roles: { role: RoleName, plan: PlanTier }[], cycle: BillingCycle): number => {
  if (roles.length < 2) return 0; // Bundle needs at least 2 roles
  
  let total = 0;
  for (const { role, plan } of roles) {
    if (plan === 'free') continue; // Free plans don't count towards bundle cost
    total += getPrice(role, plan, cycle);
  }
  
  // 20% discount applied automatically on combined total
  return Math.floor(total * 0.8);
};

export const PLAN_FEATURES: Record<RoleName, Record<PlanTier, Record<string, any>>> = {
  founder: {
    free: {
      canRegisterProfile: true,
      canPostContent: true,
      canComment: true,
      canBrowseCommunity: true,
      canUploadPitchDeck: false,
      hasVerifiedBadge: false,
      visibleInInvestorDiscovery: false,
      featuredInDiscovery: false,
      hasAlProfileSummarizer: false,
      hasProgressTracking: false,
      canConnectFollow: true,
      canDirectMessage: false,
      hasMentorshipAccess: false,
      expertConsultations: 0,
      coFounderMatching: false,
      hasReviewRating: false,
      canAttendWebinars: true,
      communityAccess: 'Read only',
      canLiveChatStream: false,
      fullLiveChatStreaming: false,
      liveMeetSessions: false,
    },
    pro: {
      canRegisterProfile: true,
      canPostContent: true,
      canComment: true,
      canBrowseCommunity: true,
      canUploadPitchDeck: true,
      hasVerifiedBadge: true,
      visibleInInvestorDiscovery: true,
      featuredInDiscovery: false,
      hasAlProfileSummarizer: false,
      hasProgressTracking: false,
      canConnectFollow: true,
      canDirectMessage: true,
      hasMentorshipAccess: true,
      expertConsultations: 2, // / month
      coFounderMatching: false,
      hasReviewRating: true,
      canAttendWebinars: true,
      communityAccess: 'Yes',
      canLiveChatStream: true,
      fullLiveChatStreaming: false,
      liveMeetSessions: false,
    },
    elite: {
      canRegisterProfile: true,
      canPostContent: true,
      canComment: true,
      canBrowseCommunity: true,
      canUploadPitchDeck: true,
      hasVerifiedBadge: true,
      visibleInInvestorDiscovery: true,
      featuredInDiscovery: true,
      hasAlProfileSummarizer: true,
      hasProgressTracking: true,
      canConnectFollow: true,
      canDirectMessage: true,
      hasMentorshipAccess: true,
      expertConsultations: 'Unlimited',
      coFounderMatching: true,
      hasReviewRating: true,
      canAttendWebinars: true,
      communityAccess: 'Yes',
      canLiveChatStream: true,
      fullLiveChatStreaming: true,
      liveMeetSessions: true,
    }
  },
  expert: {
    free: {
      canRegisterProfile: true,
      canPostContent: true,
      canComment: true,
      canAttendWebinars: true,
      expertCommunityForum: true,
      hasVerifiedBadge: false,
      visibleInDiscovery: 'Limited',
      priorityListing: false,
      inboundConsultations: 'Limited',
      maxConsultationsPerMonth: 0,
      canScheduleManageConsultations: false,
      hostPublicEventsPerMonth: 1,
      canHostPaidWebinars: false,
      canBulkMessageMentees: false,
      hasRevenueDashboard: false,
      canManageConsultationPayments: false,
      analyticsDashboard: false,
      resourceLibraryAccess: false,
      ignishaAiQnA: true,
      aiMatchedStartups: false,
      contentCreationAiTools: false,
    },
    pro: {
      canRegisterProfile: true,
      canPostContent: true,
      canComment: true,
      canAttendWebinars: true,
      expertCommunityForum: true,
      hasVerifiedBadge: true,
      visibleInDiscovery: 'Yes',
      priorityListing: false,
      inboundConsultations: 'Yes',
      maxConsultationsPerMonth: 10,
      canScheduleManageConsultations: true,
      hostPublicEventsPerMonth: 3,
      canHostPaidWebinars: true,
      canBulkMessageMentees: false,
      hasRevenueDashboard: true,
      canManageConsultationPayments: true,
      analyticsDashboard: 'Basic',
      resourceLibraryAccess: true,
      ignishaAiQnA: true,
      aiMatchedStartups: true,
      contentCreationAiTools: true,
    },
    elite: {
      canRegisterProfile: true,
      canPostContent: true,
      canComment: true,
      canAttendWebinars: true,
      expertCommunityForum: true,
      hasVerifiedBadge: true,
      visibleInDiscovery: 'Yes',
      priorityListing: true,
      inboundConsultations: 'Yes',
      maxConsultationsPerMonth: 35,
      canScheduleManageConsultations: true,
      hostPublicEventsPerMonth: 'Unlimited',
      canHostPaidWebinars: true,
      canBulkMessageMentees: true,
      hasRevenueDashboard: true,
      canManageConsultationPayments: true,
      analyticsDashboard: 'Advanced',
      resourceLibraryAccess: true,
      ignishaAiQnA: true,
      aiMatchedStartups: true,
      contentCreationAiTools: true,
    }
  },
  investor: {
    free: {
      canRegisterProfile: true,
      canPostContent: true,
      canComment: true,
      canAttendWebinars: true,
      investorCommunityForum: true,
      privatePublicMode: true,
      noUnsolicitedDMs: true,
      hasVerifiedBadge: false,
      investmentPreferencesSettings: false,
      browseFounderProfiles: 'Limited',
      advancedStartupFilters: false,
      aiFilteredDealFlow: false,
      smartFounderMatching: false,
      pitchDeckAccess: false,
      startupAnalytics: false,
      priorityStartupAccess: false,
      directMessagingWithFounders: false,
      investmentPipelineDashboard: false,
      portfolioManagementTools: false,
      dealRoomAccess: false,
      coInvestmentNetwork: false,
      legalComplianceSupport: false,
      hostPublicEventsPerMonth: 1,
      exclusiveInvestorEvents: false,
      virtualDemoDayAccess: false,
    },
    pro: {
      canRegisterProfile: true,
      canPostContent: true,
      canComment: true,
      canAttendWebinars: true,
      investorCommunityForum: true,
      privatePublicMode: true,
      noUnsolicitedDMs: true,
      hasVerifiedBadge: true,
      investmentPreferencesSettings: true,
      browseFounderProfiles: 'Unlimited',
      advancedStartupFilters: true,
      aiFilteredDealFlow: true,
      smartFounderMatching: true,
      pitchDeckAccess: true,
      startupAnalytics: 'Basic',
      priorityStartupAccess: false,
      directMessagingWithFounders: true,
      investmentPipelineDashboard: true,
      portfolioManagementTools: 'Basic',
      dealRoomAccess: false,
      coInvestmentNetwork: false,
      legalComplianceSupport: false,
      hostPublicEventsPerMonth: 3,
      exclusiveInvestorEvents: true,
      virtualDemoDayAccess: true,
    },
    elite: {
      canRegisterProfile: true,
      canPostContent: true,
      canComment: true,
      canAttendWebinars: true,
      investorCommunityForum: true,
      privatePublicMode: true,
      noUnsolicitedDMs: true,
      hasVerifiedBadge: true,
      investmentPreferencesSettings: true,
      browseFounderProfiles: 'Unlimited',
      advancedStartupFilters: true,
      aiFilteredDealFlow: true,
      smartFounderMatching: true,
      pitchDeckAccess: true,
      startupAnalytics: 'Advanced',
      priorityStartupAccess: true,
      directMessagingWithFounders: true,
      investmentPipelineDashboard: true,
      portfolioManagementTools: 'Advanced',
      dealRoomAccess: true,
      coInvestmentNetwork: true,
      legalComplianceSupport: true,
      hostPublicEventsPerMonth: 'Unlimited',
      exclusiveInvestorEvents: true,
      virtualDemoDayAccess: true,
    }
  }
};
