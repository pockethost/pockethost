export type FeatureTabNavItem = {
  href: string
  label: string
  icon?: string
  imageSrc?: string
  external?: boolean
  variant?: 'default' | 'danger'
  isActive?: boolean
}

export type FeatureTabNavSection = {
  title?: string
  items: FeatureTabNavItem[]
}

export const featureTabNavClass = (active: boolean, variant: FeatureTabNavItem['variant'] = 'default') => {
  if (variant === 'danger') {
    return active
      ? 'bg-error/15 text-error'
      : 'text-error/70 hover:text-error hover:bg-error/10'
  }
  return active ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
}
