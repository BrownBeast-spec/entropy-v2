import { Menu, Network, Activity, Zap, Beaker } from "lucide-react";
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
