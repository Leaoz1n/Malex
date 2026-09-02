async function testarSupabase() {
  const { data, error } = await supabaseClient
    .from("eventos")
    .select("*")
    .limit(5);

  if (error) {
    alert("Erro ao conectar Supabase: " + error.message);
    console.error(error);
    return;
  }

  alert("Supabase conectado com sucesso!");
  console.log("Eventos:", data);
}