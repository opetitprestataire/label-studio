import { PersonalInfo } from "./PersonalInfo";
import { EmailPreferences } from "./EmailPreferences";
import { PersonalAccessToken, PersonalAccessTokenDescription } from "./PersonalAccessToken";
import { MembershipInfo } from "./MembershipInfo";
import type React from "react";
import { PersonalJWTToken } from "./PersonalJWTToken";
import "./index.raw.css";
import { ff } from "@humansignal/core";

type SectionType = {
  title: string;
  id: string;
  component: React.FC;
  description?: React.FC;
};
export const accountSettingsSections: SectionType[] = [
  {
    title: "Personal Info",
    id: "personal-info",
    component: PersonalInfo,
  },
  {
    title: "Email Preferences",
    id: "email-preferences",
    component: EmailPreferences,
  },
  {
    title: "Membership Info",
    id: "membership-info",
    component: MembershipInfo,
  },
  {
    title: "Personal Access Token",
    id: "personal-access-token",
    // component: PersonalAccessToken,
    component: ff.isFF(ff.FF_AUTH_TOKENS) ? PersonalJWTToken : PersonalAccessToken,
    description: PersonalAccessTokenDescription,
  },
];
