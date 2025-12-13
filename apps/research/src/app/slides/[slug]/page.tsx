import fs from "fs";
import path from "path";

import { notFound } from "next/navigation";

import matter from "gray-matter";

import { MarpSlides } from "@/components/MarpSlides";
import { generateRenderedMarp } from "@/lib/marp";

async function getSlideData(slug: string) {
  const filePath = path.join(process.cwd(), "research", `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const markdown = fs.readFileSync(filePath, "utf-8");
  const { data } = matter(markdown);

  const title = data.title ? String(data.title) : slug;
  const { html, css, fonts } = await generateRenderedMarp(markdown);

  return { title, html, css, fonts };
}

export async function generateStaticParams() {
  const researchPath = path.join(process.cwd(), "research");
  const files = fs.readdirSync(researchPath);

  return files
    .filter((file) => file.endsWith(".md"))
    .map((file) => ({
      slug: file.replace(/\\.md$/, ""),
    }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const data = await getSlideData(params.slug);
  if (!data) {
    return { title: `Not Found - ${params.slug}` };
  }

  return {
    title: `${data.title}`,
  };
}

export default async function SlidePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const data = await getSlideData(params.slug);
  if (!data) {
    notFound();
    return null;
  }

  const { html, css, fonts } = data;

  return (
    <div>
      <MarpSlides
        dataHtml={JSON.stringify(html)}
        dataCss={css}
        dataFonts={JSON.stringify(fonts)}
      />
    </div>
  );
}
