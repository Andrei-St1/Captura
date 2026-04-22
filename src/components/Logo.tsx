import Image from "next/image";
import Link from "next/link";

interface Props {
  height?: number;
  linkHref?: string;
  className?: string;
}

export function Logo({ height = 32, linkHref = "/", className = "" }: Props) {
  const img = (
    <Image
      src="/logo.png"
      alt="Captura"
      height={height}
      width={0}
      style={{ width: "auto", height: `${height}px` }}
      className={className}
      priority
    />
  );

  if (!linkHref) return img;

  return (
    <Link href={linkHref} className="flex items-center shrink-0">
      {img}
    </Link>
  );
}
