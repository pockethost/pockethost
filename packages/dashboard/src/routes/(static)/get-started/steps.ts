export type StepState = {
  [_ in StepKey]: string
}

export type StepKey = keyof typeof steps

type ActionHandler = (
  state: Partial<StepState>,
  inputs: Record<string, string>,
) => Promise<ActionResult> | ActionResult

type ActionResult = string | { message: string }

export type Action = {
  display: string
  style?: string
  mode?: 'back' | 'next' | 'submit'
  value: string | ActionHandler
}

type InputBase = {
  placeholder: string
  label: string
  validator?: (
    value: string,
    state: Partial<StepState>,
  ) => Promise<string | true> | string | true
}

type SelectInput = InputBase & {
  type: 'select'
  values: { display: string; value: string }[]
}

type TextInput = InputBase & {
  type: 'text'
}

type EmailInput = InputBase & {
  type: 'email'
}

type NumberInput = InputBase & {
  type: 'number'
}

type Input = NumberInput | TextInput | SelectInput | EmailInput

type Step = {
  title: string | ((state: Partial<StepState>) => string)
  question: string | ((state: Partial<StepState>) => string)
  inputs?: Record<string, Input>
  actions?: Action[]
}

export type Steps = {
  [key: string]: Step
}

const emailAddressValidator = async (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || `Invalid email address`

export const steps: Steps = {
  email: {
    title: 'Email',
    question: 'What is your BEST email address?',
    inputs: {
      email: {
        type: 'email',
        label: 'Email',
        placeholder: `papa@elon.com`,
        validator: emailAddressValidator,
      },
    },
    actions: [
      {
        display: 'Send code',
        mode: 'submit',
        value: async () => {
          //   throw new Error(`todo`)
          return 'acknowledged'
        },
      },
    ],
  },
  otp: {
    title: (state) => `Confirm your email address`,
    question: (state) =>
      `We sent a code to ${state.email}. Please enter it below.`,
    inputs: {
      code: {
        type: 'number',
        label: 'Code',
        placeholder: '123456',
        validator: (n, state) =>
          !!n.trim().match(/^\d{6}$/) || `Invalid code. Please try again.`,
      },
    },
    actions: [
      {
        display: 'Resend code',
        style: 'btn-neutral',
        value: async () => {
          return {
            message: 'Code has been resent.',
          }
        },
      },
      {
        display: 'Continue',
        value: async () => {
          console.log(`LOGGING IN`)
          return 'ok'
        },
      },
    ],
  },
  marketing: {
    title: `Can we keep in touch?`,
    question:
      'Do you want stuff like our newsletter, lifetime offers, announcements, etc.?',
    actions: [
      {
        display: 'Unsubscribe me now',
        value: 'opt_out',
        style: 'btn-neutral',
      },
      {
        display: 'Send me goodies',
        value: 'opt_in',
      },
    ],
  },
  appIntent: {
    title: `Tell us about your project`,
    question: 'Are you planning a real app, or just trying things out?',
    actions: [
      {
        display: 'Just Trying Things Out',
        value: 'testing',
        style: 'btn-neutral',
      },
      { display: 'Real App', value: 'real' },
    ],
  },
  platform: {
    title: `Tell us about your project`,
    question: 'Which one sounds most like your app?',
    actions: [
      { display: 'iOS', value: 'ios' },
      { display: 'Android', value: 'android' },
      { display: 'Web', value: 'web' },
    ],
  },
  dbSize: {
    title: `Tell us about your project`,
    question: 'How big do you think your database will be?',
    actions: [
      { display: 'Under 1GB', value: 'small', style: 'btn-neutral' },
      { display: 'Over 1GB', value: 'large' },
    ],
  },
  customDomain: {
    title: `Tell us about your project`,
    question:
      'Do you want to use a custom domain like `api.foo.com` instead of `foo.pockethost.io`? If you say no, let me [tell you a story](/docs/why-custom-domains){.link}{.text-info}.',
    actions: [
      { display: 'No', value: 'no', style: 'btn-neutral' },
      { display: 'Yes', value: 'yes' },
    ],
  },
  fileCount: {
    title: `Tell us about your project`,
    question: "How many files do you think you'll need to store?",
    actions: [
      { display: 'Under 100', value: 'small' },
      { display: 'Over 100', value: 'large' },
    ],
  },
  fileStorage: {
    title: `Tell us about your project`,
    question: 'How much file storage do you expect?',
    actions: [
      { display: 'Under 1GB', value: 'small' },
      { display: 'Over 1GB', value: 'large' },
    ],
  },
  userCount: {
    title: `Tell us about your project`,
    question: 'How many users will your project have?',
    actions: [
      { display: 'Under 100', value: 'small' },
      { display: 'Over 100', value: 'large' },
    ],
  },
  traffic: {
    title: `Tell us about your project`,
    question: 'What kind of traffic do you expect?',
    actions: [
      { display: 'Under 1000 visits/day', value: 'small' },
      { display: 'Over 1000 visits/day', value: 'large' },
    ],
  },
  mailInfo: {
    title: `PocketHost Features`,
    question:
      'You need outgoing mail to communicate with your users for things like account creation and password resets.',
    actions: [{ display: 'Got it', value: 'acknowledged' }],
  },
  mailService: {
    title: `PocketHost Features`,
    question:
      'Do you want us to provide secure outgoing mail to communicate with your users?',
    actions: [
      { display: 'Yes', value: 'yes' },
      { display: 'No', value: 'no' },
    ],
  },
  hibernation: {
    title: `PocketHost Features`,
    question:
      "Do you want your PocketBase instance on all the time, or can we hibernate it when it's idle?",
    actions: [
      { display: 'Always on', value: 'always' },
      { display: 'Hibernate', value: 'hibernate' },
    ],
  },
  ddosInfo: {
    title: `PocketHost Features`,
    question:
      'Fun fact: PocketHost provides automatic bot and DDoS protection.',
    actions: [{ display: 'Got it', value: 'acknowledged' }],
  },
  support: {
    title: `Need help?`,
    question: "Do you think you'll need help setting up your project?",
    actions: [
      { display: 'Yes', value: 'yes' },
      { display: 'No', value: 'no' },
    ],
  },
  projectCount: {
    title: `PocketHost Features`,
    question: 'Do you think ever start more than 25 different projects?',
    actions: [
      { display: 'Under 25', value: 'small' },
      { display: 'Over 25', value: 'large' },
    ],
  },
  legal: {
    title: `Long Tall Texan`,
    question:
      'Are you doing anything with your app that would be illegal or unethical in your country or the United States?',
    actions: [
      { display: 'Yes', value: 'yes' },
      { display: 'No', value: 'no' },
    ],
  },
  edgeInfo: {
    title: `PocketHost Features`,
    question:
      'PocketHost is working on a global edge network, so your users connect through the nearest edge and are routed to your origin over a private network for fastest speeds.',
    actions: [{ display: '1337', value: 'acknowledged' }],
  },
  region: {
    title: `PocketHost Region`,
    question:
      'In a perfect world, where would you like your project to run from (origin)?',
    inputs: {
      region: {
        type: 'select',
        label: 'Region',
        placeholder: 'Select a region',
        validator: async () => '',
        values: [
          { display: 'Amsterdam, Netherlands', value: 'ams' },
          { display: 'Ashburn, Virginia (US)', value: 'iad' },
          { display: 'Atlanta, Georgia (US)', value: 'atl' },
          { display: 'Bogotá, Colombia', value: 'bog' },
          { display: 'Boston, Massachusetts (US)', value: 'bos' },
          { display: 'Bucharest, Romania', value: 'otp' },
          { display: 'Chicago, Illinois (US)', value: 'ord' },
          { display: 'Dallas, Texas (US)', value: 'dfw' },
          { display: 'Denver, Colorado (US)', value: 'den' },
          { display: 'Ezeiza, Argentina', value: 'eze' },
          { display: 'Frankfurt, Germany', value: 'fra' },
          { display: 'Guadalajara, Mexico', value: 'gdl' },
          { display: 'Hong Kong, Hong Kong', value: 'hkg' },
          { display: 'Johannesburg, South Africa', value: 'jnb' },
          { display: 'London, United Kingdom', value: 'lhr' },
          { display: 'Los Angeles, California (US)', value: 'lax' },
          { display: 'Madrid, Spain', value: 'mad' },
          { display: 'Miami, Florida (US)', value: 'mia' },
          { display: 'Montreal, Canada', value: 'yul' },
          { display: 'Mumbai, India', value: 'bom' },
          { display: 'Paris, France', value: 'cdg' },
          { display: 'Phoenix, Arizona (US)', value: 'phx' },
          { display: 'Querétaro, Mexico', value: 'qro' },
          { display: 'Rio de Janeiro, Brazil', value: 'gig' },
          { display: 'San Jose, California (US)', value: 'sjc' },
          { display: 'Santiago, Chile', value: 'scl' },
          { display: 'Sao Paulo, Brazil', value: 'gru' },
          { display: 'Seattle, Washington (US)', value: 'sea' },
          { display: 'Secaucus, NJ (US)', value: 'ewr' },
          { display: 'Singapore, Singapore', value: 'sin' },
          { display: 'Stockholm, Sweden', value: 'arn' },
          { display: 'Sydney, Australia', value: 'syd' },
          { display: 'Tokyo, Japan', value: 'nrt' },
          { display: 'Toronto, Canada', value: 'yyz' },
          { display: 'Warsaw, Poland', value: 'waw' },
        ],
      },
    },
    actions: [{ display: 'Keep going!', value: 'acknowledged' }],
  },
  discordInfo: {
    title: `PocketHost Community`,
    question:
      'We have a Discord community of over 1000 developers who can help you with your project.',
    actions: [{ display: "I'll check it out", value: 'acknowledged' }],
  },
  userInfo: {
    title: `PocketHost Users`,
    question: 'We have over 10,000 registered users.',
    actions: [{ display: "That's cool", value: 'acknowledged' }],
  },
  openSourceInfo: {
    title: `Open Source (MIT)`,
    question: 'PocketHost is an open source project.',
    actions: [{ display: 'Your mom', value: 'acknowledged' }],
  },
  done: {
    title: `You're All Set!`,
    question: 'Your instance has been created and is ready to use.',
    actions: [{ display: `Let's goooo, son!`, value: 'acknowledged' }],
  },
} as const
