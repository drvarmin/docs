import Link from "next/link";
import { DocsPage, DocsBody, DocsDescription, DocsTitle } from "fumadocs-ui/page";
import { Card } from "fumadocs-ui/components/card";
import { AppleIcon, AndroidIcon, FlutterIcon, ExpoIcon } from '@/lib/source';

const PLATFORMS = [
  {
    id: "ios",
    name: "iOS",
    description: "Native iOS development with Swift and Objective-C",
    icon: <AppleIcon />
  },
  {
    id: "android", 
    name: "Android",
    description: "Native Android development with Kotlin and Java",
    icon: <AndroidIcon />
  },
  {
    id: "flutter",
    name: "Flutter", 
    description: "Cross-platform development with Dart",
    icon: <FlutterIcon />
  },
  {
    id: "expo",
    name: "Expo",
    description: "React Native with Expo workflow",
    icon: <ExpoIcon />
  }
];

export default async function SdkChooser(props: { params: Promise<{ slug: string[] }> }) {
  // slug = ["using-revenuecat"] or ["guides","deep-linking"]
  const params = await props.params;
  const rest = "/" + params.slug.join("/");

  return (
    <DocsPage>
      <DocsTitle>Choose Your SDK</DocsTitle>
      <DocsDescription>
        Select your SDK to view the specific documentation for this topic.
      </DocsDescription>
      <DocsBody>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
          {PLATFORMS.map(platform => (
            <Link 
              key={platform.id}
              href={`/docs/${platform.id}${rest}`}
              className="no-underline"
            >
              <Card title="" className="group px-5 py-4 relative flex flex-col rounded-[var(--radius-lg)] border border-white/10 transition-colors hover:border-white/20">
                <div className="mb-4 [&_svg]:!text-teal-300">
                  {platform.icon}
                </div>
                <h3 className="font-semibold text-base text-gray-800 dark:text-white">
                  {platform.name}
                </h3>
                <p className="mt-1 font-normal text-sm leading-6 text-gray-600 dark:text-gray-400 mb-0">
                  {platform.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </DocsBody>
    </DocsPage>
  );
}