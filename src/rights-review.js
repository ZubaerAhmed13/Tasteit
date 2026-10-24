// Research-stage provenance metadata. Recording a licence link is NOT a grant
// of copyright permission or an editorial/publication approval.
export const TEXT_USE_PLANS=Object.freeze(['link-only','reuse-needs-review']);
export const PHOTO_USE_PLANS=Object.freeze(['no-photo','external-link-only','reuse-needs-review']);
const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function httpsEvidence(value) {
  if(typeof value!=='string'||value.length>500)return false;
  if(!value)return true;
  try{
    const url=new URL(value);
    return url.protocol==='https:' && !url.username && !url.password &&
      url.hostname.includes('.') && !/[\u0000-\u001f\u007f]/.test(value);
  }catch{return false;}
}
export function emptyRightsReview(){
  return {
    textPlan:'link-only',
    textLicenseUrl:'',
    textAttribution:'',
    photoPlan:'no-photo',
    photoSourceUrl:'',
    photoLicenseUrl:'',
    photoCreator:'',
    photoAttribution:'',
    reviewNotes:''
  };
}
const fields={
  textLicenseUrl:500,textAttribution:300,photoSourceUrl:500,
  photoLicenseUrl:500,photoCreator:160,photoAttribution:300,
  reviewNotes:750
};
export function validRightsReview(value) {
  if(value===undefined)return true; // Legacy research records contain no rights metadata.
  if(!isRecord(value))return false;
  if(!TEXT_USE_PLANS.includes(value.textPlan) ||
    !PHOTO_USE_PLANS.includes(value.photoPlan))return false;
  for(const [name,length] of Object.entries(fields)){
    if(typeof value[name]!=='string' || value[name].length>length)return false;
  }
  if(!httpsEvidence(value.textLicenseUrl) ||
    !httpsEvidence(value.photoSourceUrl) ||
    !httpsEvidence(value.photoLicenseUrl))return false;
  if(value.textPlan==='reuse-needs-review' &&
    (!value.textLicenseUrl || !value.textAttribution.trim()))return false;
  if(value.photoPlan==='reuse-needs-review' &&
    (!value.photoSourceUrl || !value.photoLicenseUrl ||
      !value.photoCreator.trim() || !value.photoAttribution.trim()))return false;
  return true;
}
export function prepareRightsReview(input={}){
  const next=emptyRightsReview();
  next.textPlan=String(input.textPlan||next.textPlan);
  next.photoPlan=String(input.photoPlan||next.photoPlan);
  for(const key of Object.keys(fields)){
    next[key]=String(input[key]||'').trim();
    if(next[key].length>fields[key])throw new Error('The rights record is too long.');
  }
  if(!TEXT_USE_PLANS.includes(next.textPlan)||!PHOTO_USE_PLANS.includes(next.photoPlan))
    throw new Error('Choose a recognised text and photograph reuse plan.');
  if(!httpsEvidence(next.textLicenseUrl)||!httpsEvidence(next.photoSourceUrl)||
     !httpsEvidence(next.photoLicenseUrl))
    throw new Error('Evidence and licence links must be valid HTTPS URLs.');
  if(next.textPlan==='reuse-needs-review' &&
    (!next.textLicenseUrl || !next.textAttribution))
    throw new Error('Proposed recipe-text reuse needs a licence link and attribution text.');
  if(next.photoPlan==='reuse-needs-review' &&
    (!next.photoSourceUrl || !next.photoLicenseUrl ||
      !next.photoCreator || !next.photoAttribution))
    throw new Error('Proposed photograph reuse needs the file page, licence, creator and attribution.');
  if(!validRightsReview(next))throw new Error('Invalid rights-review metadata.');
  return next;
}
export function rightsReviewChecklist(value){
  const r=validRightsReview(value) && value ? value : emptyRightsReview();
  const textEvidence=r.textPlan==='link-only' ? 'Linking to the original recipe (no copied text)' :
    'Text licence and attribution recorded; independent permission/terms review required';
  const photoEvidence=r.photoPlan==='no-photo' ? 'No photograph proposed' :
    r.photoPlan==='external-link-only' ? 'Original photograph referenced only; provider terms still apply' :
    'Photograph metadata recorded; verify file licence, creator and reuse conditions';
  return {
    textEvidence,photoEvidence,
    textReuseProposed:r.textPlan==='reuse-needs-review',
    photoReuseProposed:r.photoPlan==='reuse-needs-review',
    needsIndependentRightsReview:r.textPlan==='reuse-needs-review' || r.photoPlan==='reuse-needs-review',
    approved:false,
    publishable:false
  };
}
