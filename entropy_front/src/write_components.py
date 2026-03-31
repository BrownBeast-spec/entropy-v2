import os

base_path = '/home/beast/Documents/Personal/entropy-v2/entropy_front/src/components/ui'

components = {
  "button.jsx": """import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
})
Button.displayName = "Button"

export { Button, buttonVariants }
""",

  "navigation-menu.jsx": """import * as React from "react"
import { ChevronDownIcon } from "@radix-ui/react-icons"
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const NavigationMenu = React.forwardRef(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root ref={ref} className={cn("relative z-10 flex max-w-max flex-1 items-center justify-center", className)} {...props}>
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
))
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName

const NavigationMenuList = React.forwardRef(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List ref={ref} className={cn("group flex flex-1 list-none items-center justify-center space-x-1", className)} {...props} />
))
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName

const NavigationMenuItem = NavigationMenuPrimitive.Item

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
)

const NavigationMenuTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger ref={ref} className={cn(navigationMenuTriggerStyle(), "group", className)} {...props}>
    {children}{" "}
    <ChevronDownIcon className="relative top-[1px] ml-1 h-3 w-3 transition duration-300 group-data-[state=open]:rotate-180" aria-hidden="true" />
  </NavigationMenuPrimitive.Trigger>
))
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName

const NavigationMenuContent = React.forwardRef(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content ref={ref} className={cn("left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto", className)} {...props} />
))
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName

const NavigationMenuLink = NavigationMenuPrimitive.Link

const NavigationMenuViewport = React.forwardRef(({ className, ...props }, ref) => (
  <div className={cn("absolute left-0 top-full flex justify-center")}>
    <NavigationMenuPrimitive.Viewport className={cn("origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]", className)} ref={ref} {...props} />
  </div>
))
NavigationMenuViewport.displayName = NavigationMenuPrimitive.Viewport.displayName

export { navigationMenuTriggerStyle, NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuContent, NavigationMenuTrigger, NavigationMenuLink, NavigationMenuViewport }
""",

  "avatar.jsx": """import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "../../lib/utils"

const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root ref={ref} className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)} {...props} />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full", className)} {...props} />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback ref={ref} className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)} {...props} />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
""",

  "dropdown-menu.jsx": """import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"
import { cn } from "../../lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group
const DropdownMenuPortal = DropdownMenuPrimitive.Portal
const DropdownMenuSub = DropdownMenuPrimitive.Sub
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger ref={ref} className={cn("flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent", inset && "pl-8", className)} {...props}>
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent ref={ref} className={cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[side=bottom]:slide-in-from-top-2", className)} {...props} />
))
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[side=bottom]:slide-in-from-top-2", className)} {...props} />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item ref={ref} className={cn("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", inset && "pl-8", className)} {...props} />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup }
""",

  "vercel-navbar.jsx": """import * as React from "react";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "./navigation-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";
import { cn } from "../../lib/utils";
import { FlaskConical, Database, Activity, LayoutDashboard, Users, LogOut, CirclePlus, BookOpen } from "lucide-react";
import { Button } from "./button";
import { useState, useEffect } from "react";

const features = [
  { title: "Research", href: "#", icon: <FlaskConical strokeWidth={2} />, description: "Deep literature analysis" },
  { title: "Data Graph", href: "#", icon: <Database strokeWidth={2} />, description: "Explore biological networks" },
  { title: "Analytics", href: "#", icon: <Activity strokeWidth={2} />, description: "Insights and metrics" },
];

const workspaces = [
  { title: "Projects", href: "#", icon: <LayoutDashboard strokeWidth={2} />, description: "Manage your research" },
  { title: "Team", href: "#", icon: <Users strokeWidth={2} />, description: "Collaborate with peers" },
];

export function Header({ onHome }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={`flex sticky px-6 z-50 top-0 w-full bg-white text-slate-900 items-center h-[56px] shrink-0 justify-between transition-border duration-300 ${scrolled ? "border-b border-gray-200 shadow-sm" : "border-b border-gray-200"}`}>
      <div className="flex items-center justify-between w-full h-full">
        <div className="flex items-center">
          <span onClick={onHome} className="font-semibold text-[17px] tracking-tight font-display cursor-pointer select-none text-[#0F172A]">Entropy</span>
          <NavigationMenu className="ml-6 hidden md:flex" viewport={true}>
            <NavigationMenuList className="space-x-1">
              <NavigationMenuItem>
                <NavigationMenuTrigger className={cn(navigationMenuTriggerStyle(), "rounded-md h-8 font-medium text-[13px] text-gray-600 bg-transparent hover:bg-gray-100 data-[state=open]:bg-gray-100")}>Features</NavigationMenuTrigger>
                <NavigationMenuContent className="bg-white border-gray-200 shadow-md">
                  <ul className="grid w-[300px] p-2 grid-cols-1">
                    {features.map((component) => (
                      <ListItem key={component.title} title={component.title} icon={component.icon} href={component.href}>{component.description}</ListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger className={cn(navigationMenuTriggerStyle(), "rounded-md h-8 font-medium text-[13px] text-gray-600 bg-transparent hover:bg-gray-100 data-[state=open]:bg-gray-100")}>Workspaces</NavigationMenuTrigger>
                <NavigationMenuContent className="bg-white border-gray-200 shadow-md">
                  <ul className="grid w-[300px] p-2 grid-cols-1">
                    {workspaces.map((component) => (
                      <ListItem key={component.title} title={component.title} icon={component.icon} href={component.href}>{component.description}</ListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), "rounded-md h-8 font-medium text-[13px] text-gray-600 bg-transparent hover:bg-gray-100 cursor-pointer")}>
                  <a href="#">Docs</a>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="flex gap-3 items-center">
          <Button variant="outline" size="sm" className="hidden border-gray-200 text-gray-600 text-[13px] h-8 sm:flex shadow-sm">Contact</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="cursor-pointer w-8 h-8 rounded border border-gray-200/50">
                <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop" alt="User" />
                <AvatarFallback className="rounded bg-indigo-50 text-indigo-700 text-xs font-semibold">EN</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60 p-2 rounded-xl bg-white border-gray-200 shadow-lg" align="end">
              <div className="p-2 mb-1">
                <h1 className="font-semibold text-[14px] text-gray-900 leading-none mb-1">Sarah Researcher</h1>
                <p className="text-[12px] text-gray-500 leading-none">sarah@entropy.app</p>
              </div>
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuGroup>
                <DropdownMenuItem className="py-2.5 text-[13px] text-gray-700 cursor-pointer rounded-md focus:bg-gray-100">Dashboard</DropdownMenuItem>
                <DropdownMenuItem className="py-2.5 text-[13px] text-gray-700 cursor-pointer rounded-md focus:bg-gray-100">Account Settings</DropdownMenuItem>
                <DropdownMenuItem className="py-2.5 justify-between flex items-center text-[13px] text-gray-700 cursor-pointer rounded-md focus:bg-gray-100">
                  <span>Create Team</span> <CirclePlus className="w-3.5 h-3.5" strokeWidth={2} />
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuItem className="py-2.5 justify-between flex items-center text-[13px] text-red-600 cursor-pointer rounded-md focus:bg-red-50 focus:text-red-700">
                <span>Logout</span> <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function ListItem({ title, icon, children, href, ...props }) {
  return (
    <li {...props} className="list-none">
      <NavigationMenuLink asChild className="hover:bg-gray-50">
        <a href={href} className="block select-none space-y-1 rounded-md p-3 leading-none outline-none transition-colors hover:bg-gray-50 focus:bg-gray-50">
          <div className="flex gap-3 items-center group">
            <div className="p-2 rounded-md bg-gray-50 border border-gray-100 text-gray-500 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
              <div className="w-4 h-4 flex items-center justify-center">{icon}</div>
            </div>
            <div>
              <div className="text-[13px] font-medium leading-none text-gray-900 mb-1.5">{title}</div>
              <p className="text-gray-500 line-clamp-2 text-[12px] leading-snug">{children}</p>
            </div>
          </div>
        </a>
      </NavigationMenuLink>
    </li>
  );
}
"""
}

for filename, content in components.items():
  with open(os.path.join(base_path, filename), 'w') as f:
    f.write(content)

print("Shadcn components created successfully.")
