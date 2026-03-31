import os

base_path = '/home/beast/Documents/Personal/entropy-v2/entropy_front/src/components/ui'

components = {
  "accordion.jsx": """import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"

const Accordion = AccordionPrimitive.Root
const AccordionItem = React.forwardRef(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={cn("border-b border-gray-700/50", className)} {...props} />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger ref={ref} className={cn("flex flex-1 items-center justify-between py-4 font-medium transition-all hover:text-white [&[data-state=open]>svg]:rotate-180", className)} {...props}>
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content ref={ref} className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down" {...props}>
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
""",

  "sheet.jsx": """import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close
const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay className={cn("fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)} {...props} ref={ref} />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: { side: { top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top", bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom", left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm", right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm" } },
    defaultVariants: { side: "right" },
  }
)

const SheetContent = React.forwardRef(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className, "bg-[#171A27] text-white border-none")} {...props}>
      {children}
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary text-white">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({ className, ...props }) => <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
const SheetTitle = React.forwardRef(({ className, ...props }, ref) => <SheetPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-white", className)} {...props} />)
SheetTitle.displayName = SheetPrimitive.Title.displayName
const SheetDescription = React.forwardRef(({ className, ...props }, ref) => <SheetPrimitive.Description ref={ref} className={cn("text-sm text-gray-300", className)} {...props} />)
SheetDescription.displayName = SheetPrimitive.Description.displayName

export { Sheet, SheetPortal, SheetOverlay, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription }
""",
  
  "label.jsx": """import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70")

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
))
Label.displayName = LabelPrimitive.Root.displayName
export { Label }
""",

  "navbar.jsx": """import { Menu, Network, Activity, Zap, Beaker } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";
import { Button } from "./button";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "./navigation-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./sheet";
import { cn } from "../../lib/utils";

const Navbar1 = ({ onHome }) => {
  const menu = [
    { title: "Discover", url: "#" },
    {
      title: "Bio Graph",
      url: "#",
      items: [
        { title: "Targets", description: "Explore genetic targets", icon: <Activity className="w-5 h-5 text-indigo-400 shrink-0" />, url: "#" },
        { title: "Pathways", description: "Analyze biological pathways", icon: <Network className="w-5 h-5 text-indigo-400 shrink-0" />, url: "#" },
      ],
    },
    { title: "Competitor Intelligence", url: "#" },
  ];

  return (
    <section className="bg-[#171A27] text-white select-none shrink-0 z-30 relative px-6 h-[56px] flex items-center shadow-lg border-b border-gray-800/50">
      <div className="w-full flex justify-between items-center max-w-[1920px] mx-auto">
        
        {/* Desktop Nav */}
        <nav className="hidden lg:flex w-full justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={onHome}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                 <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="font-semibold text-[16px] tracking-tight font-display">Entropy</span>
            </div>
            
            <div className="flex items-center">
              <NavigationMenu>
                <NavigationMenuList className="flex space-x-2">
                  {menu.map((item) => (
                    <NavigationMenuItem key={item.title}>
                      {item.items ? (
                        <>
                          <NavigationMenuTrigger className="bg-transparent hover:bg-gray-800/60 focus:bg-gray-800/60 data-[state=open]:bg-gray-800/60 text-gray-300 hover:text-white font-medium text-[13px] h-9">
                            {item.title}
                          </NavigationMenuTrigger>
                          <NavigationMenuContent className="bg-[#1e2336] border-gray-700">
                            <ul className="w-64 p-2 text-white">
                              {item.items.map((sub) => (
                                <li key={sub.title}>
                                  <a href={sub.url} className="flex gap-3 p-3 hover:bg-gray-800/80 rounded-md transition-colors">
                                    {sub.icon}
                                    <div>
                                      <div className="text-[13px] font-medium leading-none mb-1">{sub.title}</div>
                                      <p className="text-[12px] text-gray-400 leading-snug">{sub.description}</p>
                                    </div>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </NavigationMenuContent>
                        </>
                      ) : (
                        <NavigationMenuLink asChild className="bg-transparent hover:bg-gray-800/60 text-gray-300 hover:text-white font-medium text-[13px] h-9 px-4 py-2 rounded-md inline-flex items-center cursor-pointer transition-colors">
                          <a href={item.url}>{item.title}</a>
                        </NavigationMenuLink>
                      )}
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 text-[13px]">
            <a href="#" className="text-gray-300 hover:text-white transition-colors font-medium">My Workspaces</a>
            <div className="flex items-center space-x-2 bg-[#2D3343] px-3 py-1.5 rounded-[4px] text-gray-200 cursor-pointer hover:bg-[#373E4F] transition-colors shadow-sm">
              <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
              <span className="font-medium">Sarah</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>
        </nav>

        {/* Mobile Nav */}
        <div className="flex lg:hidden w-full items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={onHome}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
               <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-semibold text-[16px] tracking-tight font-display">Entropy</span>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-300 hover:bg-gray-800/60 hover:text-white h-8 w-8">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto w-full sm:max-w-sm p-6" side="right">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                     <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Entropy</span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6">
                <Accordion type="single" collapsible className="w-full">
                  {menu.map((item) => (
                    item.items ? (
                      <AccordionItem value={item.title} key={item.title}>
                        <AccordionTrigger className="text-[15px] text-gray-300 hover:text-white">{item.title}</AccordionTrigger>
                        <AccordionContent>
                          <div className="flex flex-col gap-3 pl-4 border-l border-gray-800 ml-2 mt-2">
                            {item.items.map(sub => (
                              <a href={sub.url} key={sub.title} className="text-[14px] text-gray-400 hover:text-white flex items-center gap-2">
                                {sub.title}
                              </a>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ) : (
                      <a href={item.url} key={item.title} className="flex py-4 font-medium text-[15px] border-b border-gray-700/50 text-gray-300 hover:text-white">
                        {item.title}
                      </a>
                    )
                  ))}
                </Accordion>
                <div className="pt-4 mt-auto border-t border-gray-800">
                  <div className="flex items-center space-x-2 bg-[#2D3343] p-3 rounded-[6px] text-gray-200 w-full mb-3 justify-center text-[14px]">
                    <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
                    <span className="font-medium">Sarah</span>
                  </div>
                  <Button variant="outline" className="w-full bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">My Workspaces</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </section>
  );
};

export { Navbar1 as Header };
"""
}

for filename, content in components.items():
  with open(os.path.join(base_path, filename), 'w') as f:
    f.write(content)

print("Components written successfully.")
