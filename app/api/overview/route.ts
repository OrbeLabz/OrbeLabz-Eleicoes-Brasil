import {apiResponse} from "@/lib/api-response";
import {loadOverview} from "@/lib/tse-server";
export async function GET(request:Request){
  try{return apiResponse(request,await loadOverview(new URL(request.url).searchParams.get("office")??"1"));}
  catch{return apiResponse(request,{message:"Não foi possível consultar o andamento oficial."},503);}
}

export async function OPTIONS(request:Request){return apiResponse(request,null,204);}
