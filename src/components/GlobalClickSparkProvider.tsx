import ClickSpark from '@/components/ClickSpark';

export default function GlobalClickSparkProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ClickSpark
        sparkColor="#fff"
        sparkSize={10}
        sparkRadius={18}
        sparkCount={10}
        duration={500}
      />
    </>
  );
}
