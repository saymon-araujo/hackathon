"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function Instruments() {
  const [instruments, setInstruments] = useState<any[]>([]);
  const supabase = createClient();

  const fetchInstruments = async () => {
    console.log('Fetching instruments...');
    const { data, error } = await supabase.from("instruments").select();

    console.log(data, error, "data");
    if (error) {
      console.error("Error fetching instruments:", error);
    } else {
      console.log("Fetched data:", data);
    }
    setInstruments(data || []);
  };


  useEffect(() => {
    fetchInstruments();
  }, []);


  return (
    <div>
      <h1>Instruments</h1>
      <div>
        {instruments.map((instrument) => (
          <div key={instrument.id}>{instrument.name}</div>
        ))}
      </div>
    </div>
  );
}
