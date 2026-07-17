// Sample parsed case - alpha-gal syndrome from NEJM 2026
// This lets us test the whole UI without needing to parse a PDF first.
export const SAMPLE_CASE = {
  "id": "case-20-2026-a-38-year-old-man-with-abdominal-pain",
  "title": "Case 20-2026: A 38-Year-Old Man with Abdominal Pain",
  "source": "N Engl J Med 2026;395:291-300",
  "gates": [
    {
      "id": "hpi",
      "icon": "Stethoscope",
      "label": "HPI",
      "title": "History of Present Illness",
      "content": "Dr. Howard M. Heller: A 38-year-old man was evaluated at an outpatient clinic of this hospital because of abdominal pain.\n\nThe patient had been in his usual state of good health until 6 weeks before the current presentation, when watery diarrhea (up to 20 episodes per day), accompanied by fever, chills, nausea, and vomiting, developed during a 3-week trip to rural Madagascar for work. Episodes of diarrhea started approximately 1 week after he arrived in Madagascar and lasted for 3 days, during which time he had limited food intake. The symptoms then gradually resolved, and he reported feeling well for 3 days afterward; however, the diarrhea then recurred. He received a single oral dose of levofloxacin, and the diarrhea resolved after 2 days. He returned to Massachusetts and then took a brief trip to Texas.\n\nTwo weeks after returning from Madagascar, the patient began to have episodes of postprandial nausea, abdominal cramping and pain, bloating, and gas. The episodes resolved spontaneously within approximately 5 to 7 hours. No diarrhea was associated with these episodes. His symptoms did not worsen after ingestion of dairy, grains, fruits, or vegetables, but he recalled that an episode of cramping pain and bloating occurred after he had eaten a hamburger.\n\nApproximately 2 weeks after the episodes began, the patient presented to the outpatient clinic of this hospital. A review of systems was notable for an unintentional weight loss of 3 kg and fatigue that had been present for several weeks. He had no fever, chills, sweats, or respiratory, genitourinary, or neurologic symptoms. He had no known sick contacts.\n\nWhile traveling, he had consumed cooked food (including greens and meats) and only bottled water. During his recent trip to Madagascar, he had worked in forested and aquatic environments, which included wading in rivers. He had also walked barefoot around the field camp. He reported that he had been bitten by mosquitoes but had no other known insect or direct animal exposures; however, his colleagues had handled insects, birds, reptiles, and bats. The patient noted that he had had previous tick exposures, including one tick that had attached to his body in eastern Massachusetts 5 months before the trip to Madagascar, as well as possible tick exposures in South America 1 month before the trip.",
      "prompt": "Identify the most likely etiology of the current postprandial abdominal symptoms based on the travel history and prior infectious episode.",
      "teachingNotes": [
        "What key exposures during the Madagascar trip could explain persistent gastrointestinal symptoms?",
        "How does the timing of symptom onset relative to the acute diarrheal illness guide differential diagnosis?",
        "Which cognitive biases might lead you to over-emphasize tick-borne diseases versus post-infectious sequelae?"
      ]
    },
    {
      "id": "pmh-social",
      "icon": "ClipboardList",
      "label": "PMH / Social",
      "title": "Past Medical History, Medications & Social",
      "content": "Medical history included two episodes of malaria, treated with mefloquine and atovaquone-proguanil, respectively. Six years before the current admission, a screening test for HIV types 1 and 2 was negative.\n\nMedications:\n- Multivitamin\n- Melatonin as needed for sleep\n- Atovaquone-proguanil for malaria prophylaxis during recent trip to Madagascar\n\nNo known adverse drug reactions.\n\nVaccines received: COVID-19, hepatitis A and B, Japanese encephalitis, measles, mumps, rubella, polio, rabies, typhoid fever, varicella, yellow fever, and bacillus Calmette-Guerin (BCG).\n\nResidence: Massachusetts.\nOccupation: Ornithologist, with fieldwork in southern and coastal Africa, East Asia, South America, and the South Pacific.\nFamily history: Unremarkable.\nSubstance use: No alcohol, tobacco, or illicit substances.",
      "prompt": "List the patient's exposures and preventive measures that may influence the differential diagnosis.",
      "teachingNotes": [
        "Which aspects of his travel and occupational history increase risk for infectious diseases?",
        "How does his vaccination record modify the likelihood of certain infections?",
        "What is the relevance of his prior malaria episodes and prophylaxis to the current illness?"
      ]
    },
    {
      "id": "exam-labs",
      "icon": "FlaskConical",
      "label": "Exam & Labs",
      "title": "Physical Exam & Initial Labs",
      "content": "On examination, the temporal temperature was 36.6°C, the heart rate 68 beats per minute, the blood pressure 121/72 mm Hg, and the oxygen saturation 95% while the patient was breathing ambient air. The weight was 86.0 kg. He appeared well, and no lymphadenopathy was present. The abdomen was soft and nontender, with normal bowel sounds and without organomegaly. He had no rashes.\n\nThe blood levels of alanine aminotransferase, aspartate aminotransferase, alkaline phosphatase, bilirubin, albumin, globulin, and total protein were normal. The white-cell count was 7,690 per microliter (reference range, 4,500 to 11,000), and the eosinophil count was 1,700 per microliter (reference range, 0 to 900). Other laboratory test results are shown in Table 1. Specimens of blood and stool were obtained for further testing.\n\nTable 1. Laboratory Data.\n- Hemoglobin: 14.9 g/dL (reference 13.5-17.5)\n- Hematocrit: 43.3% (reference 41.0-53.0)\n- White-cell count: 7,690 /µL (reference 4,500-11,000)\n- Neutrophils: 3,100 /µL (reference 1,800-7,700)\n- Lymphocytes: 2,100 /µL (reference 1,000-4,800)\n- Monocytes: 660 /µL (reference 200-1,200)\n- Eosinophils: 1,700 /µL (reference 0-900)\n- Basophils: 110 /µL (reference 0-300)\n- Platelets: 240,000 /µL (reference 150,000-400,000)",
      "prompt": "Interpret the isolated eosinophilia in the context of this patient's presentation.",
      "teachingNotes": [
        "What differential diagnoses are most commonly associated with marked eosinophilia?",
        "How does the presence of normal organ function tests influence your diagnostic narrowing?",
        "What cognitive biases might lead you to overlook a parasitic infection despite the eosinophil count?"
      ]
    },
    {
      "id": "workup",
      "icon": "Target",
      "label": "Workup",
      "title": "Additional Workup Results",
      "content": "Over the course of the following week, the patient had episodic abdominal pain and increased frequency of bowel movements. During this time, an examination of a stool specimen revealed no ova or parasites, including cyclospora and cystoisospora. In addition, tests for antibodies to schistosoma and strongyloides and stool antigen tests for giardia and rotavirus were negative.\n\nDiagnostic test results were received.",
      "prompt": "Determine the next diagnostic step given the negative stool studies and ongoing symptoms.",
      "teachingNotes": [
        "What alternative sources of infection should be considered when stool studies are unrevealing?",
        "How might the timing of symptom onset relative to exposures influence further testing?",
        "What cognitive biases could lead you to stop investigating after initial negative results?"
      ]
    },
    {
      "id": "discussant-ddx",
      "icon": "BookOpen",
      "label": "Discussant DDx",
      "title": "Discussant's Differential Reasoning",
      "content": "Dr. Aima A. Ahonkhai: A 38-year-old ornithologist developed an acute watery diarrheal illness one week after arriving in Madagascar, treated with a single dose of levofloxacin, and now has recurrent post-prandial abdominal pain, bloating, and peripheral eosinophilia. He is immunocompetent, lives in Massachusetts, and has extensive travel history.\n\nInitial Diarrheal Illness\n- Watery diarrhea, nausea, vomiting, fever, chills began ~1 week after arrival; likely traveler's diarrhea, most commonly bacterial (enterotoxigenic E. coli). Symptoms resolved after levofloxacin.\n- Chronic post-prandial symptoms raise concern for protozoal pathogens (Giardia, Cyclospora, Cystoisospora, Dientamoeba); Giardia antigen and stool microscopy were negative, making protozoa unlikely and not explanatory for eosinophilia.\n- Persistent symptoms could reflect unmasked celiac disease, IBD, lactase deficiency, bacterial overgrowth, or post-infectious IBS, but none explain eosinophilia.\n\nHelminthic Infections\n- Eosinophilia occurs in 8-10% of returning travelers; helminths account for 14-64% of those cases.\n- Ascariasis (Ascaris lumbricoides) can cause GI symptoms 6-8 weeks after egg ingestion, but symptoms are more common in endemic residents and usually require heavy worm burden.\n- Fascioliasis (Fasciola hepatica/gigantica) results from eating raw contaminated vegetation; patient ate only cooked vegetables, lacks right-upper-quadrant pain and liver enzyme elevations, making this unlikely.\n- Hookworm (Necator americanus/Ancylostoma duodenale): possible from barefoot walking in Madagascar; would cause anemia and chronic blood loss, which are absent, so lower priority.\n- Schistosomiasis: exposure to freshwater in Madagascar; hyperendemic, fits timing of Katayama fever (2-8 weeks) though onset may be early; ranked highest among helminths.\n- Strongyloidiasis: soil exposure and barefoot contact; gastrointestinal symptoms appear ~2 weeks after infection; less likely than schistosomiasis given epidemiology.\n\nOther considerations\n- Other infectious eosinophilia (viral, bacterial, mycobacterial, fungal): HIV testing suggested but unlikely to explain abdominal pain.\n- Non-infectious eosinophilia (allergy, cancer, drug reaction): unlikely to account for GI symptoms.\n- Alpha-gal syndrome: tick bite in Massachusetts 5 months prior; IgE-mediated delayed reaction to mammalian meat causing postprandial pain, bloating, eosinophilia; possible given pre-travel exposure.\n\nTesting: stool microscopy and serology for schistosomiasis and strongyloidiasis were negative; repeat serology after 6 weeks may become positive.\n\nGiven a compatible clinical syndrome, a possible exacerbation with meat consumption (hamburger), and a known appropriate epidemiologic exposure to a tick bite before travel to Madagascar, alpha-gal syndrome is the leading diagnosis in this patient. Of note, peripheral eosinophilia is not a classic feature of alpha-gal syndrome and suggests the possibility of a concurrent eosinophilic or parasitic process. A diagnosis of alpha-gal syndrome would be supported by a positive serologic test for alpha-gal IgE and reevaluation 1 month after dietary elimination of alpha-gal-containing products to ensure symptom resolution.",
      "prompt": "Identify the most plausible diagnosis that explains the patient's post-prandial abdominal pain, bloating, and eosinophilia after travel to Madagascar.",
      "teachingNotes": [
        "What features of the history and labs point toward a helminthic infection rather than a bacterial or protozoal cause?",
        "How does eosinophilia help narrow the differential in a returning traveler with GI symptoms?",
        "Why are common post-infectious functional disorders less likely in this case?",
        "What epidemiologic factors increase the likelihood of schistosomiasis versus hookworm in this traveler?",
        "How does the timing of Katayama fever influence its consideration in the differential?"
      ]
    },
    {
      "id": "clinical-impression",
      "icon": "Stethoscope",
      "label": "Clinical Impression",
      "title": "Treating Clinician's Impression",
      "content": "Dr. Heller: Applying the principle of parsimony, I considered the probability that the patient's eosinophilia and abdominal pain were related to each other and also related to the recent trip to Madagascar. I also considered the possibility that his occupational exposures and trip to Madagascar were distractors that were unrelated to his illness. Given that he had noted that his symptoms were sometimes worse after ingestion of meat, I suspected alpha-gal syndrome and obtained a specimen of blood for alpha-gal IgE testing.\n\nClinical Diagnosis: Alpha-gal syndrome.\n\nDr. Aima A. Ahonkhai's Diagnosis: Alpha-gal syndrome.",
      "prompt": "Assess whether the patient's eosinophilia and abdominal pain are best explained by alpha-gal syndrome versus unrelated exposures.",
      "teachingNotes": [
        "What key feature of the history points toward an IgE-mediated food allergy?",
        "How does the principle of parsimony help avoid over-attributing multiple exposures?",
        "What cognitive trap might arise from focusing on the recent travel to Madagascar?"
      ]
    },
    {
      "id": "confirmatory",
      "icon": "FlaskConical",
      "label": "Confirmatory",
      "title": "Confirmatory Testing",
      "content": "Dr. Sarah M. Schrader: The diagnostic test was an enzyme-linked immunoassay for alpha-gal IgE in serum. Result: 13.10 kU/L (reference <0.10), indicating a high level of alpha-gal IgE reactivity.\n\nAlpha-gal decorates cell-membrane glycoproteins and glycolipids in almost all mammalian species. Old World monkeys, apes, and humans lack the enzyme to synthesize alpha-gal due to a frameshift variant, so they do not produce it as a self-antigen. Consequently they can develop natural IgG, IgM, and IgA antibodies from exposure to gut microbiome, pathogens, and mammalian foods, which may protect against certain infections and impede xenotransplantation. The IgE isoform detected in this patient is not naturally occurring.\n\nAlpha-gal IgE was first linked to allergic reactions after exposure to alpha-gal-containing biologics (2008) and mammalian meat (2009). Subsequent evidence ties sensitization to bites from ticks whose saliva contains alpha-gal (e.g., A. americanum in North America, Ixodes holocyclus in Australia, Ixodes ricinus in Europe). Tick saliva immunomodulators plus host factors likely induce sensitization. Once formed, alpha-gal IgE binds to IgE receptors on basophils and mast cells; re-exposure to alpha-gal (e.g., mammalian food) triggers degranulation and allergic reaction—alpha-gal syndrome. The patient's symptoms plus a positive alpha-gal IgE test confirm the diagnosis.\n\nPathological Diagnosis: Alpha-gal syndrome.",
      "prompt": "Interpret the IgE result and confirm the diagnosis of alpha-gal syndrome.",
      "teachingNotes": [
        "What threshold of alpha-gal IgE distinguishes a positive result?",
        "How does tick exposure lead to the development of IgE antibodies against a non-self carbohydrate?",
        "Why is the presence of IgG/IgM/IgA to alpha-gal not sufficient for this diagnosis?"
      ]
    },
    {
      "id": "management",
      "icon": "CheckCircle2",
      "label": "Management",
      "title": "Management & Outcome",
      "content": "- Primary treatment: avoid ingestion of mammalian meat and gelatin products, including medication capsules, gelatin-containing foods or candies, and animal-derived medications (heparin, some vaccines, antivenoms, monoclonal antibodies).\n- Symptomatic therapy: antihistamines and glucocorticoids may help prevent reactions.\n- For urticaria, respiratory symptoms, or anaphylaxis: epinephrine injectors should be available.\n- Desensitization: can be attempted under allergist care.\n- Monitoring: alpha-gal IgE level declines with avoidance; resensitization can occur after tick bites or ingestion.\n- Tick vector in North America: Amblyomma americanum; range expanding due to climate change and bird migration, illustrating One Health relevance.\n\nPatient outcome:\n- Avoided mammalian meat; symptoms resolved within 1 month.\n- Laboratory trends: absolute eosinophil count decreased from 1,700 to 787/µL at 4 weeks, then to 316/µL at 1 year; alpha-gal IgE decreased from 13.10 to 5.88 kU/L.\n- Eosinophilia resolution with meat avoidance suggests it was related to alpha-gal allergy.",
      "prompt": "List the key management steps for a patient with alpha-gal syndrome and the expected laboratory changes with avoidance.",
      "teachingNotes": [
        "What are the potential hidden sources of alpha-gal that patients might overlook?",
        "How does recognizing the tick vector influence long-term counseling?",
        "Why might eosinophilia improve after dietary avoidance in this condition?"
      ]
    },
    {
      "id": "teaching",
      "icon": "BookOpen",
      "label": "Teaching",
      "title": "Final Diagnosis & Teaching Points",
      "content": "Patient Perspective:\n\nThe Patient: I do remember being bitten by a tick in Massachusetts sometime in late May. It was a small tick, possibly a lone star tick, that bit me, so it is possible the tick exposure occurred as many as 5 months before I started to develop symptoms. Also noteworthy is that I ate red meat in Texas, probably 3 weeks before the diagnosis of alpha-gal syndrome. In the past, I had eaten red meat with no issues, and then I very suddenly started to get abdominal symptoms after eating red meat. In my discussions with Dr. Heller, what tipped us off to this was the clear association between the symptoms and eating pork or beef. I would eat something, and there would be a delay of maybe 1 to 3 hours, then I would have really severe abdominal pain without diarrhea or rash. The pain would subside maybe 5 to 7 hours later, and I would generally feel very exhausted, sort of like having the flu but without the other flu symptoms. After eating dairy, I did not have abdominal pain but just a general feeling of exhaustion.\n\nSince the diagnosis, I have cut out all red meat, dairy, gelatin — any sort of exposure I can find. I have not had feelings of exhaustion or recurrence of the abdominal pain.\n\nFinal Diagnosis: Alpha-gal syndrome.",
      "prompt": "Map the timeline of tick exposure and red-meat ingestion to the onset of symptoms and diagnosis.",
      "teachingNotes": [
        "What temporal relationship between the tick bite and symptom onset supports a delayed allergic mechanism?",
        "How does the delayed onset of abdominal pain after meat consumption help differentiate alpha-gal syndrome from other food allergies?",
        "What cognitive bias might lead a clinician to overlook a remote tick exposure when evaluating new gastrointestinal symptoms?"
      ]
    }
  ]
};
