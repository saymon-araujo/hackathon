import api from "@/services";

interface HelloWorldResponse {
  message: string;
  presidents: string[];
}

export async function fetchHelloWorld(name: string): Promise<HelloWorldResponse> {
  const { data } = await api.post('/hello-world', { name });

  if (!data) {
    let errorDetail = '';
    
    try {
      const errorData = await data.json();
      errorDetail = JSON.stringify(errorData);
    } catch (e) {
      errorDetail = data.statusText;
    }
    throw new Error(`Network response was not ok: ${data.status} - ${errorDetail}`);
  }

  try {
    return data;
  } catch (_error) {
    console.error("Failed to parse response JSON");
    throw _error;
  }
}
