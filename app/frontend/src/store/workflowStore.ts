import { create } from 'zustand';
import { Workflow, EmailSequence, EmailTemplate } from '../lib/api';

interface WorkflowStore {
  workflows: Workflow[];
  emailSequences: EmailSequence[];
  emailTemplates: EmailTemplate[];
  selectedWorkflow: Workflow | null;
  selectedEmailSequence: EmailSequence | null;
  selectedEmailTemplate: EmailTemplate | null;

  // Workflow actions
  setWorkflows: (workflows: Workflow[]) => void;
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (id: string, workflow: Partial<Workflow>) => void;
  removeWorkflow: (id: string) => void;
  selectWorkflow: (workflow: Workflow | null) => void;

  // Email sequence actions
  setEmailSequences: (sequences: EmailSequence[]) => void;
  addEmailSequence: (sequence: EmailSequence) => void;
  updateEmailSequence: (id: string, sequence: Partial<EmailSequence>) => void;
  removeEmailSequence: (id: string) => void;
  selectEmailSequence: (sequence: EmailSequence | null) => void;

  // Email template actions
  setEmailTemplates: (templates: EmailTemplate[]) => void;
  addEmailTemplate: (template: EmailTemplate) => void;
  updateEmailTemplate: (id: string, template: Partial<EmailTemplate>) => void;
  removeEmailTemplate: (id: string) => void;
  selectEmailTemplate: (template: EmailTemplate | null) => void;

  // Clear all
  clearAll: () => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  workflows: [],
  emailSequences: [],
  emailTemplates: [],
  selectedWorkflow: null,
  selectedEmailSequence: null,
  selectedEmailTemplate: null,

  // Workflow actions
  setWorkflows: (workflows) => set({ workflows }),
  addWorkflow: (workflow) =>
    set((state) => ({ workflows: [...state.workflows, workflow] })),
  updateWorkflow: (id, workflow) =>
    set((state) => ({
      workflows: state.workflows.map((w) =>
        w.id === id ? { ...w, ...workflow } : w
      ),
    })),
  removeWorkflow: (id) =>
    set((state) => ({
      workflows: state.workflows.filter((w) => w.id !== id),
    })),
  selectWorkflow: (workflow) => set({ selectedWorkflow: workflow }),

  // Email sequence actions
  setEmailSequences: (emailSequences) => set({ emailSequences }),
  addEmailSequence: (sequence) =>
    set((state) => ({
      emailSequences: [...state.emailSequences, sequence],
    })),
  updateEmailSequence: (id, sequence) =>
    set((state) => ({
      emailSequences: state.emailSequences.map((s) =>
        s.id === id ? { ...s, ...sequence } : s
      ),
    })),
  removeEmailSequence: (id) =>
    set((state) => ({
      emailSequences: state.emailSequences.filter((s) => s.id !== id),
    })),
  selectEmailSequence: (sequence) => set({ selectedEmailSequence: sequence }),

  // Email template actions
  setEmailTemplates: (emailTemplates) => set({ emailTemplates }),
  addEmailTemplate: (template) =>
    set((state) => ({
      emailTemplates: [...state.emailTemplates, template],
    })),
  updateEmailTemplate: (id, template) =>
    set((state) => ({
      emailTemplates: state.emailTemplates.map((t) =>
        t.id === id ? { ...t, ...template } : t
      ),
    })),
  removeEmailTemplate: (id) =>
    set((state) => ({
      emailTemplates: state.emailTemplates.filter((t) => t.id !== id),
    })),
  selectEmailTemplate: (template) => set({ selectedEmailTemplate: template }),

  // Clear all
  clearAll: () =>
    set({
      workflows: [],
      emailSequences: [],
      emailTemplates: [],
      selectedWorkflow: null,
      selectedEmailSequence: null,
      selectedEmailTemplate: null,
    }),
}));
