import React from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { HugeiconsIcon } from "@hugeicons/react";
import { InstagramIcon, Facebook02Icon, Linkedin02Icon, TiktokIcon } from "@hugeicons/core-free-icons";
import { Mail } from "lucide-react";
import { SOCIALS } from "@/constants";
import { SupportDialog } from "@/components/SupportDialog";
import { firmProfile, publicNavLinks, SESSION_CTA_PATH } from "@/content/firm";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-cream/50 border-t border-border pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="space-y-4">
            <Logo className="mb-4" />
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">{firmProfile.mission}</p>
            <div className="flex space-x-4 pt-2">
              {SOCIALS.map((social) => (
                <SocialLink
                  key={social.label}
                  href={social.url}
                  icon={<HugeiconsIcon icon={social.icon} size={20} />}
                  label={social.label}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-primary mb-6">Explore</h3>
            <ul className="space-y-3 text-sm">
              {publicNavLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink to={link.href === "/" ? "/home" : link.href}>{link.label}</FooterLink>
                </li>
              ))}
              <li>
                <FooterLink to="/insights/the-brief">The Brief</FooterLink>
              </li>
              <li>
                <FooterLink to={SESSION_CTA_PATH}>Book a Session</FooterLink>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-primary mb-6">Resources</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <FooterLink to="/answers">Answers</FooterLink>
              </li>
              <li>
                <FooterLink to="/locations">Cities</FooterLink>
              </li>
              <li>
                <FooterLink to="/events">Events</FooterLink>
              </li>
              <li>
                <FooterLink to="/auth">JKPR Portal</FooterLink>
              </li>
              <li>
                <SupportDialog>
                  <button className="text-muted-foreground hover:text-primary hover:translate-x-1 transition-all duration-200 inline-block">
                    Contact Support
                  </button>
                </SupportDialog>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-primary mb-6">Legal & contact</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <FooterLink to="/privacy">Privacy Policy</FooterLink>
              </li>
              <li>
                <FooterLink to="/data-deletion">Data deletion</FooterLink>
              </li>
              <li>
                <FooterLink to="/terms">Terms of Service</FooterLink>
              </li>
              <li className="flex items-center gap-3 pt-2 text-muted-foreground">
                <Mail className="w-4 h-4 text-accent" />
                <a href="mailto:welcome@jahknowspr.com" className="hover:text-primary transition-colors">
                  welcome@jahknowspr.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>© {currentYear} JahKnowsPR. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link to="/data-deletion" className="hover:text-primary transition-colors">
              Data deletion
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms
            </Link>
            <a href="/sitemap.xml" className="hover:text-primary transition-colors">
              Sitemap
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const SocialLink = ({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) => (
  <a
    href={href}
    aria-label={label}
    className="w-8 h-8 flex items-center justify-center rounded-full bg-background text-slate-600 hover:bg-primary hover:text-white transition-all duration-200 border border-border"
  >
    {icon}
  </a>
);

const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link
    to={to}
    className="text-muted-foreground hover:text-primary hover:translate-x-1 transition-all duration-200 inline-block"
  >
    {children}
  </Link>
);
