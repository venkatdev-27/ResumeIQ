import {
    ThemeTogglerButton,
} from '@/components/animate-ui/components/buttons/theme-toggler';

export default function ThemeTogglerButtonDemo({
    variant = 'outline',
    size = 'sm',
    direction = 'ltr',
    system = true,
    className = '',
}) {
    return (
        <ThemeTogglerButton
            variant={variant}
            size={size}
            direction={direction}
            className={className}
            modes={system ? ['light', 'dark', 'system'] : ['light', 'dark']}
        />
    );
}
