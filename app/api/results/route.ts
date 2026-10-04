import {apiResponse} from "@/lib/api-response";
import {loadResult,loadMany} from "@/lib/tse-server";
import {aggregateResults,STATES,type ResultResponse} from "@/lib/election-model";
import geography from "@/lib/election-geography.json";

export async function GET(request:Request){
  const query=new URL(request.url).searchParams;const office=query.get("office")??"1";
  try{
    let payload:ResultResponse;
    const cityCodes=query.get("cities");
    if(cityCodes||query.get("states")==="all"){
      const codes=cityCodes?.split(",")??Object.keys(STATES);
      if(cityCodes&&(codes.length>20||new Set(codes).size!==codes.length||codes.some(code=>!geography.cities.some(c=>c.code===code))))return apiResponse(request,{message:"Localidades inválidas"},400);
      const areas=codes.map(code=>cityCodes?{uf:"zz",city:code}:{uf:code});
      const {results,missing}=await loadMany(office,areas);
      payload={data:aggregateResults(results,cityCodes?"exterior":"brasil"),missing,partial:missing.length>0,expected:codes.length,received:results.length,checkedAt:new Date().toISOString()};
    }else{
      const data=await loadResult(office,query.get("uf")??"br",query.get("city")??undefined);
      payload={data,missing:[],partial:false,expected:1,received:1,checkedAt:new Date().toISOString()};
    }
    return apiResponse(request,payload);
  }catch(error){return apiResponse(request,{data:null,partial:true,expected:1,received:0,missing:[],checkedAt:new Date().toISOString(),message:error instanceof Error?error.message:"Não foi possível consultar o TSE."},503);}
}

export async function OPTIONS(request:Request){return apiResponse(request,null,204);}
