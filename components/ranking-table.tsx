import type { RankingItem } from "@/lib/types";

type Props = {
  items: RankingItem[];
  meUserId: string | null;
};

export function RankingTable({ items, meUserId }: Props) {
  if (items.length === 0) {
    return <p className="section-subtitle">まだランキング対象データがありません。</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>順位</th>
            <th>表示名</th>
            <th>ポイント</th>
            <th>的中率</th>
            <th>予想数</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const isMe = meUserId === row.user_id;
            const rate = `${Math.round(row.hit_rate * 100)}%`;
            return (
              <tr key={row.user_id} className={isMe ? "me-row" : undefined}>
                <td>#{row.rank}</td>
                <td>
                  {row.display_name}
                  {isMe ? "（あなた）" : ""}
                </td>
                <td>{row.points.toLocaleString()}pt</td>
                <td>{rate}</td>
                <td>{row.predictions}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
