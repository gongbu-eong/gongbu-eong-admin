import Image from "next/image";
import Link from "next/link";
import { ChannelItem } from "@/features/admin/data/dashboard";
import styles from "./ChannelList.module.css";

type ChannelListProps = {
  items: ChannelItem[];
  total: string;
  selectedChannel: string;
};

export function ChannelList({
  items,
  total,
  selectedChannel,
}: ChannelListProps) {
  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h2>유입 채널</h2>
          <p>오늘 유입 로그 기준 · 총 {total}건</p>
        </div>
        <Link href="/traffic/logs?from=dashboard">전체보기 &gt;</Link>
      </header>
      <div className={styles.list}>
        {items.map((item) => (
          <Link
            className={`${styles.item} ${
              item.key === selectedChannel ? styles.selectedItem : ""
            }`}
            href={item.href}
            key={item.key}
            scroll={false}
          >
            <span
              className={`${styles.icon} ${
                item.iconClass ? styles[item.iconClass] : ""
              }`}
            >
              {item.emoji ? (
                <span aria-hidden="true">{item.emoji}</span>
              ) : item.icon ? (
                <Image src={item.icon} width={40} height={40} alt="" />
              ) : null}
            </span>
            <div className={styles.body}>
              <div className={styles.top}>
                <strong>{item.label}</strong>
                <b>
                  {item.value}
                  <span>{item.count}</span>
                </b>
              </div>
              <div className={styles.track}>
                <i style={{ width: `${item.fill}%` }} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
