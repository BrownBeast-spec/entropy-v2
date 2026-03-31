import * as React from "react";
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
