import bcrypt from 'bcryptjs';
import { User } from './models/User.js';
import { Prompt } from './models/Prompt.js';
import { Review } from './models/Review.js';

export async function seedDatabase() {
  try {
    const userCount = await User.countDocuments();
    let adminUser, creatorUser, regularUser;

    if (userCount === 0) {
      console.log('🌱 Database empty. Seeding initial accounts...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      adminUser = await User.create({
        name: 'Alex Rivera (Admin)',
        email: 'admin@prompthub.com',
        password: hashedPassword,
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'admin',
        subscription: 'premium'
      });

      const creatorPassword = await bcrypt.hash('creator1234', 10);
      creatorUser = await User.create({
        name: 'Sarah Chen (Pro Prompt Engineer)',
        email: 'creator@prompthub.com',
        password: creatorPassword,
        photoURL: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        role: 'creator',
        subscription: 'premium'
      });

      const userPassword = await bcrypt.hash('user1234', 10);
      regularUser = await User.create({
        name: 'Marcus Vance',
        email: 'user@prompthub.com',
        password: userPassword,
        photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        role: 'user',
        subscription: 'free'
      });

      console.log('✅ Accounts seeded: admin@prompthub.com (admin123), creator@prompthub.com (creator1234), user@prompthub.com (user1234)');
    } else {
      adminUser = await User.findOne({ email: 'admin@prompthub.com' });
      if (adminUser) {
        // Ensure admin user password is set to admin123 hash
        const hashedAdminPass = await bcrypt.hash('admin123', 10);
        adminUser.password = hashedAdminPass;
        adminUser.role = 'admin';
        await adminUser.save();
      } else {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        adminUser = await User.create({
          name: 'Alex Rivera (Admin)',
          email: 'admin@prompthub.com',
          password: hashedPassword,
          photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          role: 'admin',
          subscription: 'premium'
        });
      }
      creatorUser = await User.findOne({ role: 'creator' }) || adminUser;
      regularUser = await User.findOne({ role: 'user' }) || adminUser;
    }

    const promptCount = await Prompt.countDocuments();
    if (promptCount === 0 && creatorUser) {
      console.log('🌱 Seeding initial high-quality AI prompts...');

      const initialPrompts = [
        {
          title: 'Full-Stack Next.js Architecture & Code Generator',
          description: 'Architect scalable Next.js 15 App Router applications with clean layout structures, server actions, and tailwind styling.',
          content: 'You are an elite Senior Full-Stack Architect specialized in Next.js 15, TypeScript, and Tailwind CSS.\n\nTask: Generate a clean directory layout and production-grade code for [FEATURE_NAME].\n\nGuidelines:\n1. Use React 19 server components by default.\n2. Apply modular CSS variables with dark mode support.\n3. Include input validation using Zod schema.',
          category: 'Coding',
          aiTool: 'ChatGPT',
          tags: ['Next.js', 'React', 'Full-Stack', 'Architecture'],
          difficulty: 'Pro',
          thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
          visibility: 'Public',
          copyCount: 1420,
          bookmarkCount: 380,
          status: 'approved',
          isFeatured: true,
          creatorId: creatorUser._id,
          creatorName: creatorUser.name,
          creatorEmail: creatorUser.email,
          creatorPhoto: creatorUser.photoURL
        },
        {
          title: 'Hyper-Realistic 3D Cyberpunk Character Concept Art',
          description: 'Craft photorealistic Midjourney v6 character prompts with precise cinematic camera settings, volumetric lighting, and octanestyles.',
          content: '/imagine prompt: Futuristic cyberpunk detective standing under neon-drenched Tokyo alley rain, octane render 8k, volumetric atmospheric cyan and magenta lighting, cinematic shallow depth of field, shot on 85mm anamorphic lens, highly detailed leather jacket textures --ar 16:9 --v 6.0 --style raw --s 750',
          category: 'Art & Design',
          aiTool: 'Midjourney',
          tags: ['Midjourney', 'Cyberpunk', 'Concept Art', 'Photorealism'],
          difficulty: 'Intermediate',
          thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
          visibility: 'Public',
          copyCount: 2890,
          bookmarkCount: 710,
          status: 'approved',
          isFeatured: true,
          creatorId: creatorUser._id,
          creatorName: creatorUser.name,
          creatorEmail: creatorUser.email,
          creatorPhoto: creatorUser.photoURL
        },
        {
          title: 'SaaS SEO Content Engine & Keyword Cluster Strategy',
          description: 'Comprehensive Claude prompt to conduct deep keyword intent analysis, content pillar structuring, and internal linking strategy.',
          content: 'Act as a Principal SEO Strategist for B2B SaaS.\n\nObjective: Create an end-to-end topical authority map for [TOPIC].\n\nDeliverables:\n- Primary and secondary keyword clusters with search intent.\n- 5 High-converting blog article outlines.\n- Schema markup guidance for FAQ and HowTo.',
          category: 'Marketing',
          aiTool: 'Claude',
          tags: ['SEO', 'Content Strategy', 'B2B SaaS', 'Marketing'],
          difficulty: 'Intermediate',
          thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
          visibility: 'Public',
          copyCount: 950,
          bookmarkCount: 210,
          status: 'approved',
          isFeatured: true,
          creatorId: creatorUser._id,
          creatorName: creatorUser.name,
          creatorEmail: creatorUser.email,
          creatorPhoto: creatorUser.photoURL
        },
        {
          title: 'Executive Email Refiner & High-Stakes Negotiation Writer',
          description: 'Transform informal notes into persuasive, diplomatic executive emails tailored for C-suite alignment and client closing.',
          content: 'You are a veteran Communications Director for Fortune 500 executives.\n\nRefine the following draft email into an authoritative yet empathetic communication:\n\nDraft: [INSERT_DRAFT]\n\nRequirements:\n- Maintain concise opening.\n- Highlight mutual ROI clear bullet points.\n- Strong strategic CTA.',
          category: 'Writing',
          aiTool: 'Gemini',
          tags: ['Executive', 'Email', 'Business', 'Communication'],
          difficulty: 'Beginner',
          thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
          visibility: 'Public',
          copyCount: 1840,
          bookmarkCount: 450,
          status: 'approved',
          isFeatured: true,
          creatorId: creatorUser._id,
          creatorName: creatorUser.name,
          creatorEmail: creatorUser.email,
          creatorPhoto: creatorUser.photoURL
        },
        {
          title: 'Premium AI Micro-SaaS Product Idea Evaluator & MVP Scope',
          description: '[PREMIUM PROMPT] Advanced framework for validating SaaS ideas, calculating TAM/SAM, and defining 2-week MVP feature sets.',
          content: 'PRO EXCLUSIVE CONTENT: You are a Y-Combinator Startup Advisor.\n\nAnalyze the following SaaS concept:\n[CONCEPT_NAME]\n\n1. Target Audience Pain Points (Scored 1-10).\n2. Technical feasibility matrix.\n3. Monetization models (Freemium vs Usage-Based).\n4. 14-Day MVP Development Roadmap.',
          category: 'Business',
          aiTool: 'ChatGPT',
          tags: ['Startup', 'SaaS', 'Product Strategy', 'MVP'],
          difficulty: 'Pro',
          thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
          visibility: 'Private',
          copyCount: 3400,
          bookmarkCount: 920,
          status: 'approved',
          isFeatured: true,
          creatorId: creatorUser._id,
          creatorName: creatorUser.name,
          creatorEmail: creatorUser.email,
          creatorPhoto: creatorUser.photoURL
        },
        {
          title: 'Autonomous Multi-Agent System Design Specification',
          description: '[PREMIUM PROMPT] Complete architecture prompt for building LLM multi-agent orchestrators with memory, tool routing, and fallback loops.',
          content: 'PRO EXCLUSIVE CONTENT: System Prompt for Multi-Agent Orchestration:\n\nRole: Agent Supervisor\nWorkflow:\n1. Breakdown user request into DAG subtasks.\n2. Assign tools (WebSearch, CodeExec, SQLQuery).\n3. Synthesize responses with conflict resolution.',
          category: 'Coding',
          aiTool: 'Gemini',
          tags: ['Multi-Agent', 'AI Architecture', 'LangChain', 'Python'],
          difficulty: 'Pro',
          thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&auto=format&fit=crop&q=80',
          visibility: 'Private',
          copyCount: 4120,
          bookmarkCount: 1100,
          status: 'approved',
          isFeatured: true,
          creatorId: creatorUser._id,
          creatorName: creatorUser.name,
          creatorEmail: creatorUser.email,
          creatorPhoto: creatorUser.photoURL
        }
      ];

      const insertedPrompts = await Prompt.insertMany(initialPrompts);
      console.log(`✅ ${insertedPrompts.length} prompts seeded successfully.`);

      // Seed initial sample reviews
      if (regularUser && insertedPrompts.length > 0) {
        await Review.create({
          promptId: insertedPrompts[0]._id,
          userId: regularUser._id,
          userName: regularUser.name,
          userEmail: regularUser.email,
          userPhoto: regularUser.photoURL,
          rating: 5,
          comment: 'This prompt saved me days of boilerplate configuration! The Next.js 15 structure is top notch.'
        });
        await Review.create({
          promptId: insertedPrompts[1]._id,
          userId: regularUser._id,
          userName: regularUser.name,
          userEmail: regularUser.email,
          userPhoto: regularUser.photoURL,
          rating: 5,
          comment: 'The lighting controls in this Midjourney prompt generated stunning cinematic render results.'
        });
      }
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
