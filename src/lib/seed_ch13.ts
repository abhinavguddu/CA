export const SEED_CH13 = `-- Chapter 13: The General Clauses Act, 1897
insert into public.mcq_questions (book_id, chapter_no, chapter_title, question_no, question, options, correct_index, hint)
select b.id, 13, 'The General Clauses Act, 1897', v.question_no, v.question, v.options, v.correct_index, v.hint
from public.books b
cross join lateral (values
(1, 'A word………………raise a presumption of something which Is not mandatory.', '["Shall","May","Could","Can"]'::jsonb, 1, NULL),
(2, 'Where legislation has not specifically mentioned date to come into force on a prescribed date, it shall Implemented on……………………..', '["Day that receives the assent of prime minister","Day that receives the assent of president","Both of them","None of the above"]'::jsonb, 1, NULL),
(3, 'The preamble is most important in any legislation, it……………….', '["Provides definitions in the act","Expresses scope, object and purpose of act","Provides summary of entire act","None of the above"]'::jsonb, 1, NULL),
(4, 'Some definitions used…………….such as definitions are exhaustive definitions and exactly define the term.', '["Imply","Include","Points","Means"]'::jsonb, 3, NULL),
(5, 'The act……………….defines any "Territorial extent- clause.', '["Mearley","Not","Fully","None of the above"]'::jsonb, 1, NULL),
(6, 'Official gazette means -', '["The gazette of India","The official gazette of the India","Both of them","None of the above"]'::jsonb, 1, NULL),
(7, 'Which of the following is not included in the definition of Immovable property u/s 3(26):', '["Machinery fixed to the soil","Buildings","Timber","Standing crops"]'::jsonb, 2, 'Timer Is not immovable property as the same are not permanently attached to the earth.'),
(8, 'Any matter written, expressed or described upon any substance by means of letters, figures or more than one means for purpose of recording is called…………..', '["Deed","Document","Agreement","Contract"]'::jsonb, 1, 'Document Is any matter written expressed or described upon any substance by means of letters, figures or more than one means for purpose of recording.'),
(9, 'Section shall mean a………….', '["Section of act or regulation in which word occurs","Schedule to act and or regulation in which word occurs","Both of them","None of the above"]'::jsonb, 0, NULL),
(10, 'Service by post shall be deemed to be effected when:', '["Properly addressing","Pre- paying","Posting by registered post","All of the above"]'::jsonb, 3, 'All the conditions are necessary.'),
(13, 'Government includes', '["Central government","State government","Both of them","None of the above"]'::jsonb, 2, NULL),
(16, 'Power to appoint includes……………….', '["Power to appoint ex-officio","Power to suspend or dismiss","Both of them","None of the above"]'::jsonb, 2, NULL),
(19, 'Some definitions such as……….shows extensive definitions.', '["Include","Mean","Conclude","Point"]'::jsonb, 0, NULL),
(20, 'Which is not object of General clauses act?', '["To shorten the language the central act","To provide as far as possible for uniformity of expression in central act, by giving definitions of a series of terms In common use","To elaborate language act","None of the above"]'::jsonb, 2, NULL),
(21, 'Scope, object and purpose of the act Is expressed through:', '["Legislation","Preamble","Rules","Statute"]'::jsonb, 1, 'Every act has a preamble which expresses the scope, object and purpose of the act.'),
(22, 'Imprisonment shall mean imprisonment of either description as defined in…………….?', '["Indian penal code","Central act","Both of them","None of the above"]'::jsonb, 0, NULL),
(25, 'Where any legislation requires any document to be served by post, unless a different intention appears, it deemed as……………….', '["Properly addressing","Pre-paying","Posting by registered post","All the above"]'::jsonb, 3, NULL),
(26, 'Calendar year starts from…………….', '["January","December","April","None of the above"]'::jsonb, 0, NULL),
(29, 'A word………….raise a presumption of something which is mandatory.', '["May","Could","Shall","Can"]'::jsonb, 2, NULL),
(30, 'The word “Person” shall include……………….', '["The company","Association","Both of them","None of the above"]'::jsonb, 2, NULL)
) as v(question_no, question, options, correct_index, hint)
where b.title = 'CA Inter Law MCQs by Darshan Khare'
on conflict (book_id, chapter_no, question_no) do nothing;
`;
