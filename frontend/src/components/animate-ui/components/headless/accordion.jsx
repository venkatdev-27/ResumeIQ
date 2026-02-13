import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';

import {
  Disclosure as DisclosurePrimitive,
  DisclosureButton as DisclosureButtonPrimitive,
  DisclosurePanel as DisclosurePanelPrimitive,
} from '@/components/animate-ui/primitives/headless/disclosure';
import { cn } from '@/lib/utils';

function Accordion(
  {
    as: Component = 'div',
    ...props
  }
) {
  return <Component data-slot="accordion" {...props} />;
}

function AccordionItem(
  {
    className,
    children,
    ...props
  }
) {
  return (
    <DisclosurePrimitive {...props}>
      {(bag) => (
        <div className={cn('border-b last:border-b-0', className)}>
          {typeof children === 'function' ? children(bag) : children}
        </div>
      )}
    </DisclosurePrimitive>
  );
}

function AccordionButton({
  className,
  children,
  showArrow = true,
  ...props
}) {
  return (
    <DisclosureButtonPrimitive
      className={cn(
        'focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 w-full rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-open]>svg]:rotate-180',
        className
      )}
      {...props}>
      {(bag) => (
        <>
          {typeof children === 'function' ? children(bag) : children}
          {showArrow && (
            <ChevronDownIcon
              className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200" />
          )}
        </>
      )}
    </DisclosureButtonPrimitive>
  );
}

function AccordionPanel(
  {
    className,
    children,
    ...props
  }
) {
  return (
    <DisclosurePanelPrimitive {...props}>
      {(bag) => (
        <div className={cn('text-sm pt-0 pb-4', className)}>
          {typeof children === 'function' ? children(bag) : children}
        </div>
      )}
    </DisclosurePanelPrimitive>
  );
}

export { Accordion, AccordionItem, AccordionButton, AccordionPanel };
