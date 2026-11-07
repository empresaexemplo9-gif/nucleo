import { Calendar, CheckSquare, Clock, Coffee, Mail, MessageCircle, Phone } from "lucide-react";

const MAP = { CALL: Phone, MEETING: Calendar, TASK: CheckSquare, EMAIL: Mail, DEADLINE: Clock, LUNCH: Coffee, WHATSAPP: MessageCircle };

export function ActivityIcon({ type, className }: { type: string; className?: string }) {
  const I = MAP[type as keyof typeof MAP] ?? CheckSquare;
  return <I className={className} />;
}
