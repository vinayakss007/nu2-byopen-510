import { db } from '../drizzle/db';
import { plans } from '../drizzle/schema/infra';
import { eq } from 'drizzle-orm';

async function seedPlans() {
  console.log('🌱 Seeding plans...');
  
  const planData = [
    {
      id: 'free',
      name: 'Free',
      slug: 'free',
      description: 'Perfect for small teams and startups',
      priceMonthly: '0',
      priceYearly: '0',
      maxUsers: 2,
      maxContacts: 100,
      maxDeals: 10,
      maxAutomations: 1,
      features: ['Basic CRM', '1 Pipeline', 'Email Support'],
    },
    {
      id: 'starter',
      name: 'Starter',
      slug: 'starter',
      description: 'Ideal for growing sales teams',
      priceMonthly: '49',
      priceYearly: '490',
      maxUsers: 5,
      maxContacts: 1000,
      maxDeals: 100,
      maxAutomations: 5,
      features: ['Advanced CRM', '3 Pipelines', 'Priority Support', 'Email Sequences'],
    },
    {
      id: 'pro',
      name: 'Professional',
      slug: 'pro',
      description: 'Comprehensive solution for established businesses',
      priceMonthly: '99',
      priceYearly: '990',
      maxUsers: 20,
      maxContacts: 5000,
      maxDeals: 500,
      maxAutomations: 20,
      features: ['Custom Fields', 'Unlimited Pipelines', 'AI Insights', 'Workflow Builder'],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'Scale without limits',
      priceMonthly: '299',
      priceYearly: '2990',
      maxUsers: 100,
      maxContacts: 50000,
      maxDeals: 5000,
      maxAutomations: 100,
      features: ['SSO/SAML', 'Dedicated Support', 'Audit Logs', 'Custom Integrations'],
    }
  ];

  for (const plan of planData) {
    try {
      await db.insert(plans).values(plan as any).onConflictDoUpdate({
        target: [plans.id],
        set: plan as any
      });
      console.log(`✅ Seeded plan: ${plan.name}`);
    } catch (err: any) {
      console.error(`❌ Failed to seed plan ${plan.name}:`, err);
    }
  }
}

seedPlans()
  .then(() => {
    console.log('✨ Plans seeding complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Seeding failed:', err);
    process.exit(1);
  });
