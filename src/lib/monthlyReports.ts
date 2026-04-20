import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
// @ts-ignore - jspdf-autotable types may not resolve in some setups
import autoTable from "jspdf-autotable";

export interface MonthlyData {
  yearMonth: string; // YYYY-MM
  start: string;     // ISO
  end: string;       // ISO
  daycare: any[];
  hotel: any[];
  hotelMeals: any[];
  hotelMedications: any[];
  vaccines: any[];
  flea: any[];
  feces: any[];
  taxi: any[];
  tasks: any[];
  birthdays: any[];
  qrEntries: any[];
}

export const fetchMonthlyData = async (yearMonth: string): Promise<MonthlyData> => {
  const [y, m] = yearMonth.split("-").map(Number);
  const start = new Date(y, m - 1, 1).toISOString();
  const end = new Date(y, m, 1).toISOString();
  const monthYearStr = `${y}-${String(m).padStart(2, "0")}`;

  const [
    daycareRes,
    hotelRes,
    hotelMealsRes,
    hotelMedsRes,
    vaccinesRes,
    fleaRes,
    fecesRes,
    taxiRes,
    tasksRes,
    clientsRes,
    qrRes,
  ] = await Promise.all([
    supabase.from("daily_records").select("*").gte("date", `${monthYearStr}-01`).lt("date", end.slice(0, 10)),
    supabase.from("hotel_stays").select("*").or(`check_in.gte.${start},check_out.gte.${start}`).lt("check_in", end),
    supabase.from("hotel_meals").select("*").gte("date", `${monthYearStr}-01`).lt("date", end.slice(0, 10)),
    supabase.from("hotel_medications").select("*").gte("created_at", start).lt("created_at", end),
    supabase.from("vaccine_records").select("*, clients(name, breed, tutor_name)").gte("created_at", start).lt("created_at", end),
    supabase.from("flea_records").select("*, clients(name, breed, tutor_name)").gte("created_at", start).lt("created_at", end),
    supabase.from("feces_collections").select("*, clients(name, breed, tutor_name)").eq("month_year", monthYearStr),
    supabase.from("taxi_groups").select("*").gte("created_at", start).lt("created_at", end),
    supabase.from("work_tasks").select("*").gte("due_date", `${monthYearStr}-01`).lt("due_date", end.slice(0, 10)),
    supabase.from("clients").select("name, breed, tutor_name, birth_date, tutor_birth_date"),
    supabase.from("qr_entries").select("*").gte("data_hora", start).lt("data_hora", end),
  ]);

  // Birthdays in this month
  const birthdays: any[] = [];
  (clientsRes.data || []).forEach((c: any) => {
    if (c.birth_date) {
      const d = new Date(c.birth_date);
      if (d.getMonth() + 1 === m) {
        birthdays.push({ tipo: "Pet", nome: c.name, raca: c.breed, tutor: c.tutor_name, data: d.toLocaleDateString("pt-BR") });
      }
    }
    if (c.tutor_birth_date) {
      const d = new Date(c.tutor_birth_date);
      if (d.getMonth() + 1 === m) {
        birthdays.push({ tipo: "Tutor", nome: c.tutor_name, raca: "—", tutor: c.name, data: d.toLocaleDateString("pt-BR") });
      }
    }
  });

  return {
    yearMonth,
    start, end,
    daycare: daycareRes.data || [],
    hotel: hotelRes.data || [],
    hotelMeals: hotelMealsRes.data || [],
    hotelMedications: hotelMedsRes.data || [],
    vaccines: vaccinesRes.data || [],
    flea: fleaRes.data || [],
    feces: fecesRes.data || [],
    taxi: taxiRes.data || [],
    tasks: tasksRes.data || [],
    birthdays,
    qrEntries: qrRes.data || [],
  };
};

const fmt = (s: string | null | undefined) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("pt-BR"); } catch { return s; }
};

export const generateMonthlyXlsx = (data: MonthlyData, yearMonth: string) => {
  const wb = XLSX.utils.book_new();

  const sheets: Array<{ name: string; rows: any[] }> = [
    {
      name: "Resumo",
      rows: [
        { Categoria: "Mês de referência", Valor: yearMonth },
        { Categoria: "Presenças (Creche)", Valor: data.daycare.length },
        { Categoria: "Estadias (Hotel)", Valor: data.hotel.length },
        { Categoria: "Refeições (Hotel)", Valor: data.hotelMeals.length },
        { Categoria: "Medicações administradas", Valor: data.hotelMedications.length },
        { Categoria: "Vacinas atualizadas", Valor: data.vaccines.length },
        { Categoria: "Antipulgas aplicados", Valor: data.flea.length },
        { Categoria: "Fezes coletadas", Valor: data.feces.length },
        { Categoria: "Grupos de táxi", Valor: data.taxi.length },
        { Categoria: "Tarefas da equipe", Valor: data.tasks.length },
        { Categoria: "Aniversariantes", Valor: data.birthdays.length },
        { Categoria: "Entradas QR Code", Valor: data.qrEntries.length },
      ],
    },
    {
      name: "Creche",
      rows: data.daycare.map((d) => ({
        Data: d.date, Pet: d.dog, Tutor: d.tutor, Comeu: d.ate ? "Sim" : "Não", Observações: d.notes || "",
      })),
    },
    {
      name: "Hotel",
      rows: data.hotel.map((h) => ({
        Pet: h.dog_name, Tutor: h.tutor_name, "Check-in": fmt(h.check_in), "Check-out previsto": fmt(h.expected_checkout),
        "Check-out real": fmt(h.check_out), Ativo: h.active ? "Sim" : "Não", Observações: h.observations || "",
      })),
    },
    {
      name: "Hotel-Refeições",
      rows: data.hotelMeals.map((m) => ({
        Data: m.date, Refeição: m.meal_type, Comeu: m.ate === null ? "—" : m.ate ? "Sim" : "Não", "ID Estadia": m.hotel_stay_id,
      })),
    },
    {
      name: "Medicações",
      rows: data.hotelMedications.map((m) => ({
        Medicamento: m.medication_name, Tipo: m.medication_type, "Horário": m.scheduled_time,
        Recorrência: m.recurrence, Administrado: m.administered ? "Sim" : "Não", "Aplicado em": fmt(m.administered_at), Notas: m.notes || "",
      })),
    },
    {
      name: "Vacinas",
      rows: data.vaccines.map((v: any) => ({
        Pet: v.clients?.name || "?", Raça: v.clients?.breed || "", Tutor: v.clients?.tutor_name || "",
        Tipo: v.type, Data: v.date, "Registrado em": fmt(v.created_at), Notas: v.notes || "",
      })),
    },
    {
      name: "Antipulgas",
      rows: data.flea.map((f: any) => ({
        Pet: f.clients?.name || "?", Raça: f.clients?.breed || "", Tutor: f.clients?.tutor_name || "",
        Marca: f.brand, Tipo: f.flea_type, "Duração (meses)": f.duration_months, Data: f.date, Notas: f.notes || "",
      })),
    },
    {
      name: "Fezes Coletadas",
      rows: data.feces.map((f: any) => ({
        Pet: f.clients?.name || "?", Raça: f.clients?.breed || "", Tutor: f.clients?.tutor_name || "",
        "Mês/Ano": f.month_year, Coletado: f.collected ? "Sim" : "Não", "Coletado por": f.collected_by_name || "",
        "Coletado em": fmt(f.collected_at), Notas: f.notes || "",
      })),
    },
    {
      name: "Táxi",
      rows: data.taxi.map((t) => ({
        Grupo: t.name, "Criado em": fmt(t.created_at), "Qtd entradas": Array.isArray(t.entries) ? t.entries.length : 0,
        Detalhes: JSON.stringify(t.entries),
      })),
    },
    {
      name: "Tarefas",
      rows: data.tasks.map((t) => ({
        Título: t.title, Descrição: t.description || "", Status: t.status, "Vencimento": t.due_date,
        "Horário": t.scheduled_time, Recorrência: t.recurrence, "Concluída em": fmt(t.completed_at), Nota: t.completion_note || "",
      })),
    },
    {
      name: "Aniversariantes",
      rows: data.birthdays.map((b) => ({ Tipo: b.tipo, Nome: b.nome, Raça: b.raca, "Tutor/Pet relacionado": b.tutor, Data: b.data })),
    },
    {
      name: "QR Entradas",
      rows: data.qrEntries.map((q) => ({
        "Data/Hora": fmt(q.data_hora), Pet: q.dog, Tutor: q.tutor, Raça: q.raca,
      })),
    },
  ];

  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ Aviso: "Sem dados neste mês" }]);
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  }

  XLSX.writeFile(wb, `relatorio_mensal_${yearMonth}.xlsx`);
};

export const generateMonthlyPdf = async (data: MonthlyData, yearMonth: string) => {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const violet: [number, number, number] = [124, 58, 237];

  // Cover
  pdf.setFillColor(...violet);
  pdf.rect(0, 0, 210, 50, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22).setFont("helvetica", "bold");
  pdf.text("Relatório Mensal", 105, 22, { align: "center" });
  pdf.setFontSize(14).setFont("helvetica", "normal");
  pdf.text(`Cantinho do AuAu — ${yearMonth}`, 105, 32, { align: "center" });
  pdf.setFontSize(10);
  pdf.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 105, 42, { align: "center" });
  pdf.setTextColor(0, 0, 0);

  // Summary
  autoTable(pdf, {
    startY: 60,
    head: [["Categoria", "Total"]],
    body: [
      ["Presenças (Creche)", data.daycare.length],
      ["Estadias (Hotel)", data.hotel.length],
      ["Refeições do Hotel", data.hotelMeals.length],
      ["Medicações administradas", data.hotelMedications.length],
      ["Vacinas atualizadas", data.vaccines.length],
      ["Antipulgas aplicados", data.flea.length],
      ["Fezes coletadas", data.feces.length],
      ["Grupos de Táxi", data.taxi.length],
      ["Tarefas", data.tasks.length],
      ["Aniversariantes", data.birthdays.length],
      ["Entradas QR Code", data.qrEntries.length],
    ],
    headStyles: { fillColor: violet, textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 10 },
  });

  const section = (title: string, head: string[], body: any[][]) => {
    pdf.addPage();
    pdf.setFillColor(...violet);
    pdf.rect(0, 0, 210, 14, "F");
    pdf.setTextColor(255, 255, 255).setFontSize(13).setFont("helvetica", "bold");
    pdf.text(title, 105, 9.5, { align: "center" });
    pdf.setTextColor(0, 0, 0);
    if (body.length === 0) {
      pdf.setFontSize(10).setFont("helvetica", "italic");
      pdf.text("Sem dados neste mês.", 14, 25);
      return;
    }
    autoTable(pdf, {
      startY: 20,
      head: [head],
      body,
      headStyles: { fillColor: violet, textColor: 255, fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 1.5, overflow: "linebreak" },
      columnStyles: { 0: { cellWidth: "auto" } },
    });
  };

  section("Creche — Presenças Diárias", ["Data", "Pet", "Tutor", "Comeu", "Obs"],
    data.daycare.map((d) => [d.date, d.dog, d.tutor, d.ate ? "Sim" : "Não", d.notes || ""]));

  section("Hotel — Estadias", ["Pet", "Tutor", "Check-in", "Saída prev.", "Saída real", "Ativo"],
    data.hotel.map((h) => [h.dog_name, h.tutor_name, fmt(h.check_in), fmt(h.expected_checkout), fmt(h.check_out), h.active ? "Sim" : "Não"]));

  section("Hotel — Medicações Administradas", ["Medicamento", "Tipo", "Horário", "Recorrência", "Aplicado"],
    data.hotelMedications.map((m) => [m.medication_name, m.medication_type, m.scheduled_time, m.recurrence, m.administered ? "Sim" : "Não"]));

  section("Vacinas Atualizadas", ["Pet", "Tutor", "Tipo", "Data", "Registrado em"],
    data.vaccines.map((v: any) => [v.clients?.name || "?", v.clients?.tutor_name || "", v.type, v.date, fmt(v.created_at)]));

  section("Antipulgas Aplicados", ["Pet", "Tutor", "Marca", "Tipo", "Duração", "Data"],
    data.flea.map((f: any) => [f.clients?.name || "?", f.clients?.tutor_name || "", f.brand, f.flea_type, `${f.duration_months}m`, f.date]));

  section("Fezes Coletadas", ["Pet", "Tutor", "Coletado", "Coletado por", "Data"],
    data.feces.map((f: any) => [f.clients?.name || "?", f.clients?.tutor_name || "", f.collected ? "Sim" : "Não", f.collected_by_name || "", fmt(f.collected_at)]));

  section("Grupos de Táxi", ["Grupo", "Criado em", "Qtd entradas"],
    data.taxi.map((t) => [t.name, fmt(t.created_at), Array.isArray(t.entries) ? t.entries.length : 0]));

  section("Tarefas da Equipe", ["Título", "Status", "Vencimento", "Horário", "Concluída em"],
    data.tasks.map((t) => [t.title, t.status, t.due_date, t.scheduled_time, fmt(t.completed_at)]));

  section("Aniversariantes do Mês", ["Tipo", "Nome", "Raça", "Relacionado", "Data"],
    data.birthdays.map((b) => [b.tipo, b.nome, b.raca, b.tutor, b.data]));

  pdf.save(`relatorio_mensal_${yearMonth}.pdf`);
};
