(function () {
  if (window.HOUSE_I18N) return;

  const STORAGE_KEY = "houseGuideLanguage";
  const CACHE_PREFIX = "houseGuideTranslations:v5.9.0:";
  const MAX_REQUEST_RETRIES = 2;
  const languages = Object.freeze([
    { code: "en", label: "English" },
    { code: "th", label: "ไทย" },
    { code: "zh-CN", label: "简体中文" },
    { code: "ru", label: "Русский" },
    { code: "de", label: "Deutsch" },
    { code: "fr", label: "Français" },
    { code: "es", label: "Español" }
  ]);
  const languageCodes = new Set(languages.map((item) => item.code));
  const explorePageNames = new Set([
    "activities.html", "activity.html", "bar.html", "bars.html", "beach.html", "beaches.html",
    "cafe.html", "cafes.html", "diving.html", "explore.html", "restaurant.html", "restaurants.html",
    "shop.html", "shopping.html"
  ]);
  const pageName = location.pathname.split("/").filter(Boolean).pop() || "index.html";
  const exploreContentDeferred = explorePageNames.has(pageName);
  const dictionary = new Map();

  function add(en, th, zh, ru, de, fr, es) {
    dictionary.set(en, { en, th, "zh-CN": zh, ru, de, fr, es });
  }

  // Navigation, actions and concierge controls. These are reviewed, built-in
  // translations so the essential interface never depends on a model request.
  add("Language", "ภาษา", "语言", "Язык", "Sprache", "Langue", "Idioma");
  add("Choose language", "เลือกภาษา", "选择语言", "Выбрать язык", "Sprache auswählen", "Choisir la langue", "Elegir idioma");
  add("Menu", "เมนู", "菜单", "Меню", "Menü", "Menu", "Menú");
  add("Translating this page…", "กำลังแปลหน้านี้…", "正在翻译此页面…", "Перевод страницы…", "Diese Seite wird übersetzt…", "Traduction de cette page…", "Traduciendo esta página…");
  add("Your Room", "ห้องของคุณ", "您的客房", "Ваш номер", "Ihr Zimmer", "Votre chambre", "Tu habitación");
  add("The House", "The House", "The House", "The House", "The House", "The House", "The House");
  add("Guest Information", "ข้อมูลสำหรับผู้เข้าพัก", "住客信息", "Информация для гостей", "Gästeinformationen", "Informations clients", "Información para huéspedes");
  add("Explore", "เที่ยวเกาะ", "探索", "Остров", "Entdecken", "Découvrir", "Explorar");
  add("Help & Emergency", "ความช่วยเหลือและเหตุฉุกเฉิน", "帮助与紧急情况", "Помощь и экстренные ситуации", "Hilfe & Notfall", "Aide et urgences", "Ayuda y emergencias");
  add("Departure", "วันเดินทางกลับ", "离店", "Выезд", "Abreise", "Départ", "Salida");
  add("Contact Us", "ติดต่อเรา", "联系我们", "Связаться с нами", "Kontakt aufnehmen", "Nous contacter", "Contáctanos");
  add("Book with Us", "จองกับเรา", "通过我们预订", "Забронировать через нас", "Bei uns buchen", "Réserver avec nous", "Reserva con nosotros");
  add("Call Us", "โทรหาเรา", "致电我们", "Позвонить нам", "Uns anrufen", "Nous appeler", "Llámanos");
  add("Call", "โทร", "致电", "Позвонить", "Anrufen", "Appeler", "Llamar");
  add("Open Map", "เปิดแผนที่", "打开地图", "Открыть карту", "Karte öffnen", "Ouvrir la carte", "Abrir mapa");
  add("Visit Website", "เยี่ยมชมเว็บไซต์", "访问网站", "Открыть сайт", "Website besuchen", "Visiter le site", "Visitar sitio web");
  add("Discover →", "ดูเพิ่มเติม →", "查看详情 →", "Подробнее →", "Entdecken →", "Découvrir →", "Descubrir →");
  add("View details", "ดูรายละเอียด", "查看详情", "Подробнее", "Details ansehen", "Voir les détails", "Ver detalles");
  add("Guest registration", "ลงทะเบียนผู้เข้าพัก", "住客登记", "Регистрация гостя", "Gästeregistrierung", "Enregistrement client", "Registro de huéspedes");
  add("Concierge", "คอนเซียร์จ", "礼宾服务", "Консьерж", "Concierge", "Conciergerie", "Conserjería");
  add("AI Concierge", "AI คอนเซียร์จ", "AI 礼宾服务", "AI-консьерж", "AI-Concierge", "Conciergerie IA", "Conserjería con IA");
  add("Concierge is thinking", "คอนเซียร์จกำลังประมวลผล", "礼宾服务正在思考", "Консьерж готовит ответ", "Der Concierge bereitet eine Antwort vor", "La conciergerie prépare une réponse", "La conserjería está preparando una respuesta");
  add("Welcome", "ยินดีต้อนรับ", "欢迎", "Добро пожаловать", "Willkommen", "Bienvenue", "Bienvenido");
  add("Common questions", "คำถามที่พบบ่อย", "常见问题", "Частые вопросы", "Häufige Fragen", "Questions fréquentes", "Preguntas frecuentes");
  add("Set your room", "เลือกห้องของคุณ", "选择您的客房", "Укажите номер", "Zimmer auswählen", "Choisir votre chambre", "Elige tu habitación");
  add("Which room are you staying in?", "คุณพักอยู่ห้องไหน", "您住在哪个房间？", "В каком номере вы остановились?", "In welchem Zimmer wohnen Sie?", "Dans quelle chambre séjournez-vous ?", "¿En qué habitación te alojas?");
  add("Selecting your room lets the concierge prepare the right support message.", "การเลือกห้องช่วยให้คอนเซียร์จเตรียมข้อความช่วยเหลือที่ถูกต้อง", "选择房间后，礼宾服务可为您准备正确的协助信息。", "Указав номер, вы поможете консьержу подготовить правильное сообщение для службы поддержки.", "Mit der Zimmerauswahl kann der Concierge die passende Support-Nachricht vorbereiten.", "Choisir votre chambre permet à la conciergerie de préparer le bon message d’assistance.", "Elegir tu habitación permite a la conserjería preparar el mensaje de ayuda adecuado.");
  add("Send", "ส่ง", "发送", "Отправить", "Senden", "Envoyer", "Enviar");
  add("Ask about your stay…", "ถามเกี่ยวกับการเข้าพักของคุณ…", "询问住宿相关问题…", "Задайте вопрос о проживании…", "Fragen Sie zu Ihrem Aufenthalt…", "Posez une question sur votre séjour…", "Pregunta sobre tu estancia…");
  add("Ask the AI Concierge", "ถาม AI คอนเซียร์จ", "咨询 AI 礼宾服务", "Спросить AI-консьержа", "AI-Concierge fragen", "Interroger la conciergerie IA", "Preguntar a la conserjería con IA");
  add("Close AI Concierge", "ปิด AI คอนเซียร์จ", "关闭 AI 礼宾服务", "Закрыть AI-консьержа", "AI-Concierge schließen", "Fermer la conciergerie IA", "Cerrar la conserjería con IA");
  add("Close room selector", "ปิดตัวเลือกห้อง", "关闭房间选择", "Закрыть выбор номера", "Zimmerauswahl schließen", "Fermer le choix de chambre", "Cerrar selector de habitación");
  add("Was this helpful?", "ข้อมูลนี้มีประโยชน์ไหม", "这有帮助吗？", "Это было полезно?", "War das hilfreich?", "Cela vous a-t-il aidé ?", "¿Te ha resultado útil?");
  add("Yes", "ใช่", "是", "Да", "Ja", "Oui", "Sí");
  add("No", "ไม่", "否", "Нет", "Nein", "Non", "No");
  add("This answer was helpful", "คำตอบนี้มีประโยชน์", "此回答有帮助", "Ответ был полезен", "Diese Antwort war hilfreich", "Cette réponse était utile", "Esta respuesta fue útil");
  add("This answer was not helpful", "คำตอบนี้ไม่มีประโยชน์", "此回答没有帮助", "Ответ не помог", "Diese Antwort war nicht hilfreich", "Cette réponse n’était pas utile", "Esta respuesta no fue útil");
  add("Answers use approved information from The House. Please do not share passport, payment or key-box details here.", "คำตอบใช้เฉพาะข้อมูลที่ The House อนุมัติ โปรดอย่าแชร์ข้อมูลหนังสือเดินทาง การชำระเงิน หรือรหัสกล่องกุญแจที่นี่", "回答仅使用 The House 批准的信息。请勿在此分享护照、付款或钥匙盒信息。", "Ответы основаны на подтверждённой информации The House. Не сообщайте здесь паспортные, платёжные данные или код бокса для ключей.", "Die Antworten basieren auf freigegebenen Informationen von The House. Bitte teilen Sie hier keine Pass-, Zahlungs- oder Schlüsselboxdaten.", "Les réponses utilisent les informations approuvées par The House. Ne communiquez ici aucune donnée de passeport, de paiement ou de boîte à clés.", "Las respuestas utilizan información aprobada por The House. No compartas aquí datos de pasaporte, pago ni de la caja de llaves.");
  add("Before I continue, which room are you staying in?", "ก่อนดำเนินการต่อ คุณพักอยู่ห้องไหน", "继续之前，请问您住在哪个房间？", "Прежде чем продолжить, скажите, в каком номере вы остановились?", "Bevor ich fortfahre: In welchem Zimmer wohnen Sie?", "Avant de continuer, dans quelle chambre séjournez-vous ?", "Antes de continuar, ¿en qué habitación te alojas?");
  add("Please shorten your question to 800 characters or fewer.", "โปรดย่อคำถามให้เหลือไม่เกิน 800 ตัวอักษร", "请将问题缩短至 800 个字符以内。", "Сократите вопрос до 800 символов.", "Bitte kürzen Sie Ihre Frage auf höchstens 800 Zeichen.", "Veuillez limiter votre question à 800 caractères.", "Reduce la pregunta a un máximo de 800 caracteres.");
  add("Ask a Human", "ติดต่อเจ้าหน้าที่", "联系工作人员", "Связаться с сотрудником", "Mitarbeiter kontaktieren", "Contacter une personne", "Contactar con una persona");
  add("Thank you. Your feedback helps improve the concierge.", "ขอบคุณ ความคิดเห็นของคุณช่วยพัฒนาคอนเซียร์จ", "谢谢。您的反馈有助于改进礼宾服务。", "Спасибо. Ваш отзыв помогает улучшать работу консьержа.", "Vielen Dank. Ihr Feedback hilft, den Concierge zu verbessern.", "Merci. Votre avis aide à améliorer la conciergerie.", "Gracias. Tu opinión ayuda a mejorar la conserjería.");
  add("Feedback could not be saved.", "ไม่สามารถบันทึกความคิดเห็นได้", "无法保存反馈。", "Не удалось сохранить отзыв.", "Feedback konnte nicht gespeichert werden.", "L’avis n’a pas pu être enregistré.", "No se pudo guardar la opinión.");

  // Reservation verification, registration and protected spare-key controls.
  add("Secure guest access", "การเข้าถึงที่ปลอดภัยสำหรับผู้เข้าพัก", "安全住客访问", "Защищённый доступ гостя", "Sicherer Gästezugang", "Accès sécurisé client", "Acceso seguro para huéspedes");
  add("Verify your Airbnb stay", "ยืนยันการเข้าพัก Airbnb ของคุณ", "验证您的 Airbnb 住宿", "Подтвердите бронирование Airbnb", "Airbnb-Aufenthalt verifizieren", "Vérifiez votre séjour Airbnb", "Verifica tu estancia de Airbnb");
  add("Airbnb confirmation code", "รหัสยืนยัน Airbnb", "Airbnb 确认码", "Код подтверждения Airbnb", "Airbnb-Bestätigungscode", "Code de confirmation Airbnb", "Código de confirmación de Airbnb");
  add("Verify my stay", "ยืนยันการเข้าพักของฉัน", "验证我的住宿", "Подтвердить проживание", "Aufenthalt verifizieren", "Vérifier mon séjour", "Verificar mi estancia");
  add("Usually begins with HM. The code is checked securely and is never stored in readable form.", "โดยทั่วไปจะขึ้นต้นด้วย HM ระบบตรวจสอบรหัสอย่างปลอดภัยและไม่จัดเก็บในรูปแบบที่อ่านได้", "通常以 HM 开头。该代码会被安全验证，且绝不会以可读形式存储。", "Обычно начинается с HM. Код проверяется безопасно и не хранится в читаемом виде.", "Beginnt normalerweise mit HM. Der Code wird sicher geprüft und niemals lesbar gespeichert.", "Il commence généralement par HM. Le code est vérifié de façon sécurisée et n’est jamais stocké sous une forme lisible.", "Normalmente empieza por HM. El código se comprueba de forma segura y nunca se almacena en formato legible.");
  add("Required guest registration", "การลงทะเบียนผู้เข้าพักที่จำเป็น", "必需的住客登记", "Обязательная регистрация гостя", "Erforderliche Gästeregistrierung", "Enregistrement client obligatoire", "Registro obligatorio de huéspedes");
  add("Upload passport securely", "อัปโหลดหนังสือเดินทางอย่างปลอดภัย", "安全上传护照", "Безопасно загрузить паспорт", "Pass sicher hochladen", "Importer le passeport en toute sécurité", "Subir el pasaporte de forma segura");
  add("Upload another non-Thai guest passport", "อัปโหลดหนังสือเดินทางของผู้เข้าพักต่างชาติอีกคน", "上传另一位非泰籍住客的护照", "Загрузить паспорт ещё одного иностранного гостя", "Pass eines weiteren nicht-thailändischen Gastes hochladen", "Importer le passeport d’un autre client non thaïlandais", "Subir el pasaporte de otro huésped no tailandés");
  add("All overnight guests are Thai nationals", "ผู้เข้าพักค้างคืนทุกคนเป็นบุคคลสัญชาติไทย", "所有过夜住客均为泰国公民", "Все гости, остающиеся на ночь, являются гражданами Таиланда", "Alle Übernachtungsgäste sind thailändische Staatsangehörige", "Tous les clients passant la nuit sont de nationalité thaïlandaise", "Todos los huéspedes que pasan la noche son ciudadanos tailandeses");
  add("This TM30 Immigration accommodation registration applies only to non-Thai guests. Thai nationals do not need to upload a passport. If any non-Thai guest is staying overnight, securely upload a passport for each one.", "การลงทะเบียนที่พักตามแบบ TM30 ของสำนักงานตรวจคนเข้าเมืองนี้ใช้กับผู้เข้าพักที่ไม่ใช่คนไทยเท่านั้น ผู้มีสัญชาติไทยไม่จำเป็นต้องอัปโหลดหนังสือเดินทาง หากมีผู้เข้าพักที่ไม่ใช่คนไทยค้างคืน โปรดอัปโหลดหนังสือเดินทางของแต่ละคนอย่างปลอดภัย", "此项 TM30 移民住宿登记仅适用于非泰国籍住客。泰国公民无需上传护照。如有任何非泰国籍住客过夜，请为每位住客安全上传护照。", "Регистрация проживания TM30 в иммиграционной службе требуется только для иностранных гостей. Гражданам Таиланда загружать паспорт не нужно. Если остаются иностранные гости, безопасно загрузите паспорт каждого из них.", "Diese TM30-Unterkunftsmeldung bei der Einwanderungsbehörde gilt nur für nicht-thailändische Gäste. Thailändische Staatsangehörige müssen keinen Pass hochladen. Wenn nicht-thailändische Gäste übernachten, laden Sie bitte für jede Person sicher einen Pass hoch.", "Cette déclaration d’hébergement TM30 auprès de l’immigration concerne uniquement les clients non thaïlandais. Les ressortissants thaïlandais n’ont pas à importer leur passeport. Si des clients non thaïlandais passent la nuit, importez de manière sécurisée le passeport de chacun.", "Este registro de alojamiento TM30 ante Inmigración solo se aplica a huéspedes no tailandeses. Los ciudadanos tailandeses no necesitan subir el pasaporte. Si se aloja algún huésped no tailandés, sube de forma segura el pasaporte de cada uno.");
  add("Choose the Thai-national exemption only when every overnight guest on this reservation is Thai. Passport images use a private, room-bound, single-use upload form and are automatically deleted 14 days after upload, or sooner after processing. Never send passport information in the concierge chat or WhatsApp.", "เลือกข้อยกเว้นสำหรับผู้มีสัญชาติไทยเฉพาะเมื่อผู้เข้าพักค้างคืนทุกคนในการจองนี้มีสัญชาติไทย รูปหนังสือเดินทางจะอัปโหลดผ่านแบบฟอร์มส่วนตัวที่ผูกกับห้องและใช้ได้ครั้งเดียว และจะถูกลบโดยอัตโนมัติ 14 วันหลังอัปโหลด หรือเร็วกว่านั้นหลังดำเนินการเสร็จ โปรดอย่าส่งข้อมูลหนังสือเดินทางในแชตคอนเซียร์จหรือ WhatsApp", "仅当此预订的所有过夜住客均为泰国公民时，才选择泰国公民豁免。护照图片通过与房间绑定的私密一次性表单上传，并会在上传 14 天后自动删除；处理完成后也可能提前删除。切勿在礼宾聊天或 WhatsApp 中发送护照信息。", "Выбирайте освобождение для граждан Таиланда только в том случае, если все гости, остающиеся на ночь по этому бронированию, являются гражданами Таиланда. Изображения паспортов загружаются через конфиденциальную одноразовую форму, привязанную к номеру, и автоматически удаляются через 14 дней после загрузки или раньше после обработки. Никогда не отправляйте паспортные данные в чате консьержа или WhatsApp.", "Wählen Sie die Ausnahme für thailändische Staatsangehörige nur, wenn alle Übernachtungsgäste dieser Buchung thailändische Staatsangehörige sind. Passbilder werden über ein privates, zimmergebundenes und nur einmal nutzbares Formular hochgeladen und 14 Tage nach dem Upload oder nach der Bearbeitung bereits früher automatisch gelöscht. Senden Sie Passdaten niemals im Concierge-Chat oder über WhatsApp.", "Choisissez l’exemption pour ressortissants thaïlandais uniquement si tous les clients passant la nuit dans le cadre de cette réservation sont de nationalité thaïlandaise. Les images de passeport sont importées au moyen d’un formulaire privé, lié à la chambre et à usage unique, puis supprimées automatiquement 14 jours après l’importation, ou plus tôt après traitement. N’envoyez jamais de données de passeport dans le chat de la conciergerie ni sur WhatsApp.", "Selecciona la exención para ciudadanos tailandeses solo si todos los huéspedes que pasan la noche en esta reserva son ciudadanos tailandeses. Las imágenes de pasaporte se suben mediante un formulario privado, vinculado a la habitación y de un solo uso, y se eliminan automáticamente 14 días después de la carga o antes tras su procesamiento. Nunca envíes datos del pasaporte por el chat de conserjería ni por WhatsApp.");
  add("Protected after-hours access", "การเข้าถึงที่ได้รับการป้องกันนอกเวลาทำการ", "受保护的非服务时段访问", "Защищённый доступ в нерабочее время", "Geschützter Zugang außerhalb der Servicezeiten", "Accès protégé hors horaires", "Acceso protegido fuera de horario");
  add("Lost key or locked out?", "กุญแจหายหรือเข้าห้องไม่ได้ใช่ไหม", "钥匙丢失或被锁在门外？", "Потеряли ключ или не можете войти?", "Schlüssel verloren oder ausgesperrt?", "Clé perdue ou porte verrouillée ?", "¿Has perdido la llave o no puedes entrar?");
  add("Show my spare-key code", "แสดงรหัสกุญแจสำรองของฉัน", "显示我的备用钥匙密码", "Показать код запасного ключа", "Code für Ersatzschlüssel anzeigen", "Afficher le code de ma clé de secours", "Mostrar el código de mi llave de repuesto");
  add("Copy code", "คัดลอกรหัส", "复制密码", "Скопировать код", "Code kopieren", "Copier le code", "Copiar código");
  add("Secure spare-key access", "เข้าถึงกุญแจสำรองอย่างปลอดภัย", "安全获取备用钥匙", "Защищённый доступ к запасному ключу", "Sicherer Ersatzschlüssel-Zugang", "Accès sécurisé à la clé de secours", "Acceso seguro a la llave de repuesto");
  add("Verifying your Airbnb stay…", "กำลังยืนยันการเข้าพัก Airbnb ของคุณ…", "正在验证您的 Airbnb 住宿…", "Проверяем бронирование Airbnb…", "Airbnb-Aufenthalt wird geprüft…", "Vérification de votre séjour Airbnb…", "Verificando tu estancia de Airbnb…");
  add("Stay verified for Room {room}.", "ยืนยันการเข้าพักสำหรับห้อง {room} แล้ว", "房间 {room} 的住宿已验证。", "Проживание в номере {room} подтверждено.", "Aufenthalt für Zimmer {room} verifiziert.", "Séjour vérifié pour la chambre {room}.", "Estancia verificada para la habitación {room}.");
  add("Verified stay: {checkIn} to {checkOut}.", "การเข้าพักที่ยืนยันแล้ว: {checkIn} ถึง {checkOut}", "已验证住宿：{checkIn} 至 {checkOut}。", "Подтверждённое проживание: с {checkIn} по {checkOut}.", "Verifizierter Aufenthalt: {checkIn} bis {checkOut}.", "Séjour vérifié : du {checkIn} au {checkOut}.", "Estancia verificada: del {checkIn} al {checkOut}.");
  add("Registration is still required for each non-Thai overnight guest.", "ผู้เข้าพักต่างชาติที่ค้างคืนแต่ละคนยังต้องลงทะเบียน", "每位过夜的非泰籍住客仍须登记。", "Каждый иностранный гость, остающийся на ночь, должен пройти регистрацию.", "Für jeden nicht-thailändischen Übernachtungsgast ist die Registrierung weiterhin erforderlich.", "L’enregistrement reste obligatoire pour chaque client non thaïlandais passant la nuit.", "El registro sigue siendo obligatorio para cada huésped no tailandés que pase la noche.");
  add("Passport information received securely. If another non-Thai guest is staying overnight, you can upload another passport.", "ได้รับข้อมูลหนังสือเดินทางอย่างปลอดภัยแล้ว หากมีผู้เข้าพักต่างชาติอีกคนค้างคืน คุณสามารถอัปโหลดหนังสือเดินทางเพิ่มเติมได้", "护照信息已安全收到。如有另一位非泰籍住客过夜，您可以继续上传其护照。", "Паспортные данные безопасно получены. Если остаётся ещё один иностранный гость, можно загрузить ещё один паспорт.", "Passdaten sicher erhalten. Wenn ein weiterer nicht-thailändischer Gast übernachtet, können Sie einen weiteren Pass hochladen.", "Informations du passeport reçues en toute sécurité. Si un autre client non thaïlandais passe la nuit, vous pouvez importer un autre passeport.", "Información del pasaporte recibida de forma segura. Si se aloja otro huésped no tailandés, puedes subir otro pasaporte.");
  add("Thai-national exemption recorded. No passport upload is required because all overnight guests on this reservation are Thai nationals.", "บันทึกการยกเว้นสำหรับบุคคลสัญชาติไทยแล้ว ไม่ต้องอัปโหลดหนังสือเดินทางเนื่องจากผู้เข้าพักค้างคืนทุกคนในการจองนี้เป็นบุคคลสัญชาติไทย", "已记录泰国公民豁免。由于此预订的所有过夜住客均为泰国公民，因此无需上传护照。", "Освобождение для граждан Таиланда зарегистрировано. Загрузка паспорта не требуется, поскольку все гости, остающиеся на ночь по этому бронированию, являются гражданами Таиланда.", "Die Ausnahme für thailändische Staatsangehörige wurde gespeichert. Es ist kein Pass-Upload erforderlich, da alle Übernachtungsgäste dieser Buchung thailändische Staatsangehörige sind.", "L’exemption pour les ressortissants thaïlandais a été enregistrée. Aucun passeport n’est requis, car tous les clients passant la nuit dans le cadre de cette réservation sont de nationalité thaïlandaise.", "Se ha registrado la exención para ciudadanos tailandeses. No es necesario subir ningún pasaporte porque todos los huéspedes que pasan la noche en esta reserva son ciudadanos tailandeses.");
  add("Please confirm the 500 THB lost-key replacement fee before continuing.", "โปรดยืนยันค่าทดแทนกุญแจหาย 500 THB ก่อนดำเนินการต่อ", "继续前请确认 500 THB 的钥匙遗失更换费。", "Перед продолжением подтвердите сбор 500 THB за замену утерянного ключа.", "Bitte bestätigen Sie vor dem Fortfahren die Ersatzgebühr von 500 THB für den verlorenen Schlüssel.", "Veuillez confirmer les frais de remplacement de 500 THB pour la clé perdue avant de continuer.", "Confirma la tarifa de sustitución de 500 THB por pérdida de llave antes de continuar.");
  add("Verifying the after-hours request and notifying the team…", "กำลังตรวจสอบคำขอนอกเวลาทำการและแจ้งทีม…", "正在验证非服务时段请求并通知团队…", "Проверяем запрос и уведомляем команду…", "Anfrage wird geprüft und das Team benachrichtigt…", "Vérification de la demande et notification de l’équipe…", "Verificando la solicitud y avisando al equipo…");
  add("Spare key access approved for Room {room}.", "อนุมัติการเข้าถึงกุญแจสำรองสำหรับห้อง {room} แล้ว", "已批准房间 {room} 的备用钥匙访问。", "Доступ к запасному ключу для номера {room} разрешён.", "Ersatzschlüssel-Zugang für Zimmer {room} genehmigt.", "Accès à la clé de secours approuvé pour la chambre {room}.", "Acceso a la llave de repuesto aprobado para la habitación {room}.");

  // Frequently used room, registration and emergency labels.
  add("Check-in", "เช็กอิน", "入住", "Заезд", "Check-in", "Arrivée", "Entrada");
  add("Wi-Fi", "Wi-Fi", "Wi-Fi", "Wi-Fi", "WLAN", "Wi-Fi", "Wi-Fi");
  add("Fresh towels", "ผ้าเช็ดตัวใหม่", "更换毛巾", "Свежие полотенца", "Frische Handtücher", "Serviettes propres", "Toallas limpias");
  add("Room cleaning", "ทำความสะอาดห้อง", "客房清洁", "Уборка номера", "Zimmerreinigung", "Nettoyage de la chambre", "Limpieza de la habitación");
  add("Lost key", "กุญแจหาย", "钥匙遗失", "Потерянный ключ", "Verlorener Schlüssel", "Clé perdue", "Llave perdida");
  add("Urgent problem", "ปัญหาเร่งด่วน", "紧急问题", "Срочная проблема", "Dringendes Problem", "Problème urgent", "Problema urgente");
  add("Emergency", "เหตุฉุกเฉิน", "紧急情况", "Экстренная ситуация", "Notfall", "Urgence", "Emergencia");
  add("Call Koh Tao Rescue", "โทรหา Koh Tao Rescue", "致电 Koh Tao Rescue", "Позвонить в Koh Tao Rescue", "Koh Tao Rescue anrufen", "Appeler Koh Tao Rescue", "Llamar a Koh Tao Rescue");
  add("Call Medical Emergency 1669", "โทรฉุกเฉินการแพทย์ 1669", "致电医疗急救 1669", "Позвонить в скорую помощь 1669", "Medizinischen Notruf 1669 anrufen", "Appeler les urgences médicales au 1669", "Llamar a emergencias médicas al 1669");
  add("For an accident or urgent medical situation, call Koh Tao Rescue first", "หากเกิดอุบัติเหตุหรือเหตุฉุกเฉินทางการแพทย์ ให้โทรหา Koh Tao Rescue ก่อน", "如遇事故或紧急医疗情况，请先致电 Koh Tao Rescue", "При несчастном случае или срочной медицинской ситуации сначала позвоните в Koh Tao Rescue", "Rufen Sie bei einem Unfall oder dringenden medizinischen Notfall zuerst Koh Tao Rescue an", "En cas d’accident ou d’urgence médicale, appelez d’abord Koh Tao Rescue", "En caso de accidente o urgencia médica, llama primero a Koh Tao Rescue");
  add("because they know the island and local access points. You can also call Thailand's national medical emergency number 1669. Both options are shown below.", "เพราะทีมรู้จักพื้นที่บนเกาะและจุดเข้าถึงต่าง ๆ เป็นอย่างดี คุณสามารถโทรหมายเลขฉุกเฉินการแพทย์แห่งชาติของไทย 1669 ได้เช่นกัน ตัวเลือกทั้งสองแสดงไว้ด้านล่าง", "因为他们熟悉岛上环境和当地通行路线。您也可以拨打泰国全国医疗急救电话 1669。以下列出两个选项。", "поскольку служба хорошо знает остров и местные подъездные пути. Также можно позвонить по национальному номеру скорой медицинской помощи Таиланда 1669. Оба варианта указаны ниже.", "weil das Team die Insel und die örtlichen Zufahrtswege kennt. Sie können außerdem Thailands landesweiten medizinischen Notruf 1669 anrufen. Beide Möglichkeiten sind unten aufgeführt.", "car l’équipe connaît bien l’île et les accès locaux. Vous pouvez également appeler le numéro national des urgences médicales en Thaïlande, le 1669. Les deux options figurent ci-dessous.", "porque el equipo conoce bien la isla y los accesos locales. También puedes llamar al número nacional de emergencias médicas de Tailandia, el 1669. A continuación se muestran ambas opciones.");
  add("1. Koh Tao Rescue", "1. Koh Tao Rescue", "1. Koh Tao Rescue", "1. Koh Tao Rescue", "1. Koh Tao Rescue", "1. Koh Tao Rescue", "1. Koh Tao Rescue");
  add("Recommended first for accidents and urgent medical help because the team knows Koh Tao and local access points.", "แนะนำให้โทรเป็นอันดับแรกเมื่อเกิดอุบัติเหตุหรือต้องการความช่วยเหลือทางการแพทย์เร่งด่วน เพราะทีมรู้จักเกาะเต่าและจุดเข้าถึงต่าง ๆ เป็นอย่างดี", "发生事故或需要紧急医疗援助时，建议优先致电；该团队熟悉 Koh Tao 及当地通行路线。", "Рекомендуется звонить в первую очередь при несчастных случаях и необходимости срочной медицинской помощи, поскольку команда хорошо знает Koh Tao и местные подъездные пути.", "Bei Unfällen und dringendem medizinischem Hilfebedarf zuerst empfohlen, da das Team Koh Tao und die örtlichen Zufahrtswege kennt.", "À appeler en priorité en cas d’accident ou d’urgence médicale, car l’équipe connaît bien Koh Tao et les accès locaux.", "Recomendado como primera opción para accidentes y ayuda médica urgente, porque el equipo conoce bien Koh Tao y los accesos locales.");
  add("2. National Medical Emergency — 1669", "2. เหตุฉุกเฉินการแพทย์แห่งชาติ — 1669", "2. 全国医疗急救 — 1669", "2. Национальная скорая медицинская помощь — 1669", "2. Nationaler medizinischer Notruf — 1669", "2. Urgences médicales nationales — 1669", "2. Emergencias médicas nacionales — 1669");
  add("Thailand's national medical emergency number is also available for serious or life-threatening situations.", "หมายเลขฉุกเฉินการแพทย์แห่งชาติของไทยพร้อมให้บริการสำหรับสถานการณ์ร้ายแรงหรือเป็นอันตรายถึงชีวิตเช่นกัน", "遇到严重或危及生命的情况，也可拨打泰国全国医疗急救电话。", "В серьёзной или угрожающей жизни ситуации также можно позвонить по национальному номеру скорой медицинской помощи Таиланда.", "Thailands landesweiter medizinischer Notruf steht ebenfalls für schwere oder lebensbedrohliche Situationen zur Verfügung.", "Le numéro national des urgences médicales en Thaïlande est également disponible en cas de situation grave ou mettant la vie en danger.", "El número nacional de emergencias médicas de Tailandia también está disponible para situaciones graves o que pongan en peligro la vida.");
  add("Medical Care", "การรักษาพยาบาล", "医疗服务", "Медицинская помощь", "Medizinische Versorgung", "Soins médicaux", "Atención médica");
  add("Need help with your stay?", "ต้องการความช่วยเหลือระหว่างเข้าพักไหม", "住宿期间需要帮助吗？", "Нужна помощь во время проживания?", "Benötigen Sie Hilfe während Ihres Aufenthalts?", "Besoin d’aide pendant votre séjour ?", "¿Necesitas ayuda durante tu estancia?");
  add("Activities & Bookings", "กิจกรรมและการจอง", "活动与预订", "Развлечения и бронирования", "Aktivitäten & Buchungen", "Activités et réservations", "Actividades y reservas");
  add("House information", "ข้อมูลที่พัก", "住宿信息", "Информация о доме", "Hausinformationen", "Informations sur la maison", "Información de la casa");
  add("Practical Information", "ข้อมูลที่เป็นประโยชน์", "实用信息", "Практическая информация", "Praktische Informationen", "Informations pratiques", "Información práctica");
  add("Required guest registration", "ต้องลงทะเบียนผู้เข้าพัก", "必须完成住客登记", "Обязательная регистрация гостя", "Erforderliche Gästeregistrierung", "Enregistrement client obligatoire", "Registro de huéspedes obligatorio");
  add("Complete your passport information", "กรอกข้อมูลหนังสือเดินทางให้เรียบร้อย", "完成护照信息提交", "Предоставьте паспортные данные", "Passinformationen vervollständigen", "Complétez vos informations de passeport", "Completa los datos de tu pasaporte");
  add("Required registration for non-Thai guests", "การลงทะเบียนที่จำเป็นสำหรับผู้เข้าพักที่ไม่ใช่คนไทย", "非泰国籍住客必须登记", "Обязательная регистрация для гостей, не являющихся гражданами Таиланда", "Erforderliche Registrierung für nicht-thailändische Gäste", "Enregistrement obligatoire pour les clients non thaïlandais", "Registro obligatorio para huéspedes no tailandeses");
  add("Non-Thai guests: complete your passport information", "ผู้เข้าพักที่ไม่ใช่คนไทย: กรุณากรอกข้อมูลหนังสือเดินทาง", "非泰国籍住客：请完成护照信息提交", "Гости, не являющиеся гражданами Таиланда: предоставьте паспортные данные", "Nicht-thailändische Gäste: Passinformationen vervollständigen", "Clients non thaïlandais : complétez les informations de votre passeport", "Huéspedes no tailandeses: completa los datos de tu pasaporte");
  add("Non-Thai guests: use your private registration link", "ผู้เข้าพักที่ไม่ใช่คนไทย: ใช้ลิงก์ลงทะเบียนส่วนตัว", "非泰国籍住客：使用私人登记链接", "Гости, не являющиеся гражданами Таиланда: используйте личную ссылку для регистрации", "Nicht-thailändische Gäste: privaten Registrierungslink verwenden", "Clients non thaïlandais : utilisez votre lien privé d’enregistrement", "Huéspedes no tailandeses: usa tu enlace privado de registro");
  add("Complete Required Registration — Non-Thai Guests", "ดำเนินการลงทะเบียนที่จำเป็น — ผู้เข้าพักที่ไม่ใช่คนไทย", "完成必要登记 — 非泰国籍住客", "Завершить обязательную регистрацию — гости, не являющиеся гражданами Таиланда", "Erforderliche Registrierung abschließen — nicht-thailändische Gäste", "Terminer l’enregistrement obligatoire — clients non thaïlandais", "Completar el registro obligatorio — huéspedes no tailandeses");
  add("Use Your Private Registration Link", "ใช้ลิงก์ลงทะเบียนส่วนตัวของคุณ", "使用您的私人登记链接", "Использовать личную ссылку регистрации", "Privaten Registrierungslink verwenden", "Utiliser votre lien d’enregistrement privé", "Usar tu enlace privado de registro");
  add("Complete Required Registration", "ดำเนินการลงทะเบียนที่จำเป็น", "完成必须登记", "Пройти обязательную регистрацию", "Erforderliche Registrierung abschließen", "Effectuer l’enregistrement obligatoire", "Completar el registro obligatorio");

  // Secure passport form: every privacy and status instruction is built in.
  add("Private guest registration", "การลงทะเบียนผู้เข้าพักแบบส่วนตัว", "私人住客登记", "Частная регистрация гостя", "Private Gästeregistrierung", "Enregistrement client privé", "Registro privado de huéspedes");
  add("Secure one-time form", "แบบฟอร์มปลอดภัย ใช้ได้ครั้งเดียว", "安全的一次性表格", "Защищённая одноразовая форма", "Sicheres Einmalformular", "Formulaire sécurisé à usage unique", "Formulario seguro de un solo uso");
  add("Passport information", "ข้อมูลหนังสือเดินทาง", "护照信息", "Паспортные данные", "Passinformationen", "Informations de passeport", "Datos del pasaporte");
  add("Please use this private form if The House has asked for your passport information before or during your stay.", "โปรดใช้แบบฟอร์มส่วนตัวนี้ หาก The House ขอข้อมูลหนังสือเดินทางของคุณก่อนหรือระหว่างการเข้าพัก", "如果 The House 在您入住前或住宿期间要求提供护照信息，请使用此私人表格。", "Используйте эту закрытую форму, если The House запросил ваши паспортные данные до или во время проживания.", "Bitte verwenden Sie dieses private Formular, wenn The House vor oder während Ihres Aufenthalts um Ihre Passinformationen gebeten hat.", "Utilisez ce formulaire privé si The House vous a demandé vos informations de passeport avant ou pendant votre séjour.", "Utiliza este formulario privado si The House te ha solicitado los datos del pasaporte antes o durante la estancia.");
  add("Why we need it", "เหตุผลที่เราต้องใช้ข้อมูลนี้", "我们为何需要这些信息", "Зачем это нужно", "Warum wir diese Daten benötigen", "Pourquoi nous en avons besoin", "Por qué los necesitamos");
  add("The House needs the information to complete the required TM30 Immigration accommodation registration for guests. If we did not receive it before your arrival, please submit it as soon as possible through this page.", "The House ต้องใช้ข้อมูลนี้เพื่อดำเนินการแจ้งที่พักอาศัย TM30 ตามข้อกำหนดของสำนักงานตรวจคนเข้าเมืองสำหรับผู้เข้าพัก หากเรายังไม่ได้รับข้อมูลก่อนคุณมาถึง โปรดส่งผ่านหน้านี้โดยเร็วที่สุด", "The House 需要这些信息，以完成移民局要求的住客 TM30 住宿登记。如果我们在您抵达前尚未收到，请尽快通过此页面提交。", "The House нужны эти данные для обязательной регистрации проживания гостей в иммиграционной системе TM30. Если мы не получили их до вашего приезда, отправьте их как можно скорее через эту страницу.", "The House benötigt diese Angaben für die vorgeschriebene TM30-Unterkunftsmeldung bei der Einwanderungsbehörde. Falls sie uns vor Ihrer Ankunft noch nicht vorlagen, übermitteln Sie sie bitte so bald wie möglich über diese Seite.", "The House a besoin de ces informations pour effectuer la déclaration d’hébergement TM30 obligatoire auprès de l’immigration. Si nous ne les avons pas reçues avant votre arrivée, veuillez les transmettre dès que possible via cette page.", "The House necesita estos datos para completar el registro de alojamiento TM30 exigido por Inmigración. Si no los recibimos antes de tu llegada, envíalos cuanto antes a través de esta página.");
  add("How we protect your information", "วิธีที่เราปกป้องข้อมูลของคุณ", "我们如何保护您的信息", "Как мы защищаем ваши данные", "So schützen wir Ihre Daten", "Comment nous protégeons vos informations", "Cómo protegemos tus datos");
  add("This link is private, tied to one room, expires automatically and can be used only once.", "ลิงก์นี้เป็นลิงก์ส่วนตัว ผูกกับห้องเดียว หมดอายุอัตโนมัติ และใช้ได้เพียงครั้งเดียว", "此链接为私人链接，仅绑定一个房间，会自动过期且只能使用一次。", "Эта ссылка является личной, привязана к одному номеру, автоматически истекает и может быть использована только один раз.", "Dieser Link ist privat, einem Zimmer zugeordnet, läuft automatisch ab und kann nur einmal verwendet werden.", "Ce lien est privé, associé à une seule chambre, expire automatiquement et ne peut être utilisé qu’une fois.", "Este enlace es privado, está vinculado a una habitación, caduca automáticamente y solo puede usarse una vez.");
  add("Your passport image goes to private document storage. It is not sent through WhatsApp or the AI Concierge.", "ภาพหนังสือเดินทางจะถูกส่งไปยังพื้นที่จัดเก็บเอกสารส่วนตัว โดยไม่ส่งผ่าน WhatsApp หรือ AI คอนเซียร์จ", "您的护照图片会存入私人文件存储空间，不会通过 WhatsApp 或 AI 礼宾服务发送。", "Изображение паспорта поступает в закрытое хранилище документов и не отправляется через WhatsApp или AI-консьержа.", "Ihr Passbild wird in einem privaten Dokumentenspeicher abgelegt. Es wird nicht über WhatsApp oder den AI-Concierge gesendet.", "L’image de votre passeport est envoyée vers un espace privé de stockage de documents. Elle n’est transmise ni par WhatsApp ni par la conciergerie IA.", "La imagen del pasaporte se guarda en un almacenamiento privado de documentos. No se envía por WhatsApp ni por la conserjería con IA.");
  add("Only an owner using the protected operations area can retrieve or delete it.", "มีเพียงเจ้าของที่ใช้พื้นที่ปฏิบัติการที่มีการป้องกันเท่านั้นที่สามารถเรียกดูหรือลบไฟล์ได้", "只有通过受保护操作区域的业主才能查看或删除该文件。", "Получить или удалить файл может только владелец через защищённый рабочий раздел.", "Nur ein Eigentümer mit Zugang zum geschützten Betriebsbereich kann die Datei abrufen oder löschen.", "Seul un propriétaire utilisant l’espace d’opérations protégé peut récupérer ou supprimer le fichier.", "Solo un propietario que acceda al área operativa protegida puede recuperar o eliminar el archivo.");
  add("The file is deleted automatically after the short period shown below, or sooner when an owner deletes it after processing.", "ไฟล์จะถูกลบอัตโนมัติหลังพ้นระยะเวลาสั้น ๆ ที่แสดงด้านล่าง หรือเร็วกว่านั้นเมื่อเจ้าของลบหลังดำเนินการเสร็จ", "文件会在下方所示的短期后自动删除；业主处理完毕后也可提前删除。", "Файл автоматически удаляется по истечении указанного ниже короткого срока либо раньше, если владелец удалит его после обработки.", "Die Datei wird nach der unten angegebenen kurzen Frist automatisch gelöscht oder früher, wenn ein Eigentümer sie nach der Bearbeitung löscht.", "Le fichier est supprimé automatiquement après la courte période indiquée ci-dessous, ou plus tôt si un propriétaire le supprime après traitement.", "El archivo se elimina automáticamente tras el breve periodo indicado abajo, o antes si un propietario lo borra después de procesarlo.");
  add("The document is used for guest registration, not marketing or AI training.", "เอกสารนี้ใช้เพื่อลงทะเบียนผู้เข้าพักเท่านั้น ไม่ใช้เพื่อการตลาดหรือฝึก AI", "该文件仅用于住客登记，不用于营销或 AI 训练。", "Документ используется для регистрации гостя, а не для маркетинга или обучения ИИ.", "Das Dokument wird zur Gästeregistrierung verwendet, nicht für Marketing oder KI-Training.", "Le document sert à l’enregistrement des clients, et non au marketing ni à l’entraînement de l’IA.", "El documento se utiliza para el registro de huéspedes, no para marketing ni para entrenar IA.");
  add("Thai nationals do not need to complete this registration.", "ผู้มีสัญชาติไทยไม่ต้องดำเนินการลงทะเบียนนี้", "泰国公民无需完成此登记。", "Гражданам Таиланда не нужно проходить эту регистрацию.", "Thailändische Staatsangehörige müssen diese Registrierung nicht durchführen.", "Les ressortissants thaïlandais n’ont pas besoin d’effectuer cet enregistrement.", "Los ciudadanos tailandeses no necesitan completar este registro.");
  add("Thai national?", "ผู้มีสัญชาติไทย?", "泰国公民？", "Гражданин Таиланда?", "Thailändische Staatsangehörigkeit?", "Ressortissant thaïlandais ?", "¿Ciudadano tailandés?");
  add("You do not need to upload a passport for this registration. Please tell The House so the unused request can be closed.", "คุณไม่ต้องอัปโหลดหนังสือเดินทางสำหรับการลงทะเบียนนี้ โปรดแจ้ง The House เพื่อปิดคำขอที่ไม่ได้ใช้", "您无需为此登记上传护照。请告知 The House，以便关闭未使用的申请。", "Для этой регистрации загружать паспорт не нужно. Сообщите The House, чтобы неиспользованный запрос был закрыт.", "Für diese Registrierung müssen Sie keinen Pass hochladen. Bitte informieren Sie The House, damit die nicht benötigte Anfrage geschlossen werden kann.", "Vous n’avez pas besoin d’importer de passeport pour cet enregistrement. Veuillez en informer The House afin que la demande inutilisée soit clôturée.", "No necesitas subir un pasaporte para este registro. Informa a The House para que se cierre la solicitud no utilizada.");
  add("Checking your private link…", "กำลังตรวจสอบลิงก์ส่วนตัวของคุณ…", "正在检查您的私人链接…", "Проверяем личную ссылку…", "Ihr privater Link wird geprüft…", "Vérification de votre lien privé…", "Comprobando tu enlace privado…");
  add("Registration choices", "ตัวเลือกการลงทะเบียน", "登记方式", "Способы регистрации", "Registrierungsoptionen", "Options d’enregistrement", "Opciones de registro");
  add("Option 1 — Upload passport image", "ตัวเลือก 1 — อัปโหลดภาพหนังสือเดินทาง", "选项 1 — 上传护照图片", "Вариант 1 — Загрузить изображение паспорта", "Option 1 — Passbild hochladen", "Option 1 — Importer l’image du passeport", "Opción 1 — Subir una imagen del pasaporte");
  add("Use a clear image of the passport photo-and-details page.", "ใช้ภาพหน้าหนังสือเดินทางที่มีรูปถ่ายและรายละเอียดอย่างชัดเจน", "请使用护照照片及个人信息页的清晰图片。", "Используйте чёткое изображение страницы паспорта с фотографией и данными.", "Verwenden Sie ein deutliches Bild der Passseite mit Foto und Angaben.", "Utilisez une image nette de la page du passeport comportant la photo et les informations.", "Utiliza una imagen nítida de la página del pasaporte con la foto y los datos.");
  add("Option 2 — Enter the required details", "ตัวเลือก 2 — กรอกข้อมูลที่จำเป็น", "选项 2 — 填写所需信息", "Вариант 2 — Ввести необходимые данные", "Option 2 — Erforderliche Angaben eingeben", "Option 2 — Saisir les informations requises", "Opción 2 — Introducir los datos necesarios");
  add("This secure form will be activated after The House confirms the exact required TM30 fields. We will not ask you to guess or enter unnecessary information.", "แบบฟอร์มปลอดภัยนี้จะเปิดใช้งานหลังจาก The House ยืนยันรายการข้อมูล TM30 ที่จำเป็นอย่างถูกต้อง เราจะไม่ขอให้คุณคาดเดาหรือกรอกข้อมูลที่ไม่จำเป็น", "The House 确认 TM30 所需的准确字段后，此安全表格才会启用。我们不会要求您猜测或填写不必要的信息。", "Эта защищённая форма будет активирована после того, как The House подтвердит точный перечень обязательных полей TM30. Мы не будем просить вас угадывать или вводить лишние данные.", "Dieses sichere Formular wird aktiviert, sobald The House die exakt erforderlichen TM30-Felder bestätigt hat. Wir bitten Sie nicht, Angaben zu erraten oder unnötige Daten einzugeben.", "Ce formulaire sécurisé sera activé lorsque The House aura confirmé les champs TM30 exactement requis. Nous ne vous demanderons pas de deviner ni de saisir des informations inutiles.", "Este formulario seguro se activará cuando The House confirme exactamente los campos exigidos para el TM30. No te pediremos que adivines ni que introduzcas información innecesaria.");
  add("Choose a clear passport image", "เลือกภาพหนังสือเดินทางที่ชัดเจน", "选择清晰的护照图片", "Выберите чёткое изображение паспорта", "Deutliches Passbild auswählen", "Choisissez une image nette du passeport", "Elige una imagen nítida del pasaporte");
  add("Use the page that shows the passport holder’s photo and details. JPEG, PNG, WebP or HEIC; maximum 10 MB.", "ใช้หน้าที่แสดงรูปถ่ายและข้อมูลของผู้ถือหนังสือเดินทาง รองรับ JPEG, PNG, WebP หรือ HEIC ขนาดสูงสุด 10 MB", "请使用显示护照持有人照片和信息的页面。支持 JPEG、PNG、WebP 或 HEIC；最大 10 MB。", "Используйте страницу с фотографией и данными владельца паспорта. JPEG, PNG, WebP или HEIC; максимум 10 МБ.", "Verwenden Sie die Seite mit Foto und Angaben des Passinhabers. JPEG, PNG, WebP oder HEIC; maximal 10 MB.", "Utilisez la page comportant la photo et les informations du titulaire. JPEG, PNG, WebP ou HEIC ; 10 Mo maximum.", "Utiliza la página que muestra la foto y los datos del titular. JPEG, PNG, WebP o HEIC; máximo 10 MB.");
  add("I am authorized to submit this passport image to The House for the guest registration described above.", "ฉันได้รับอนุญาตให้ส่งภาพหนังสือเดินทางนี้ให้ The House เพื่อการลงทะเบียนผู้เข้าพักตามที่อธิบายไว้ข้างต้น", "我已获授权，可将此护照图片提交给 The House，用于上述住客登记。", "Я уполномочен(а) передать это изображение паспорта The House для описанной выше регистрации гостя.", "Ich bin berechtigt, dieses Passbild für die oben beschriebene Gästeregistrierung an The House zu übermitteln.", "Je suis autorisé(e) à transmettre cette image de passeport à The House pour l’enregistrement décrit ci-dessus.", "Estoy autorizado/a a enviar esta imagen del pasaporte a The House para el registro descrito anteriormente.");
  add("Upload securely", "อัปโหลดอย่างปลอดภัย", "安全上传", "Безопасно загрузить", "Sicher hochladen", "Importer en toute sécurité", "Subir de forma segura");
  add("Do not paste passport details into the AI Concierge. If this link does not work, ask The House to issue a new private link.", "อย่าวางข้อมูลหนังสือเดินทางใน AI คอนเซียร์จ หากลิงก์นี้ใช้ไม่ได้ โปรดขอให้ The House ออกลิงก์ส่วนตัวใหม่", "请勿将护照信息粘贴到 AI 礼宾服务中。如果此链接无法使用，请让 The House 重新提供私人链接。", "Не вводите паспортные данные в AI-консьерже. Если ссылка не работает, попросите The House выдать новую личную ссылку.", "Fügen Sie keine Passdaten in den AI-Concierge ein. Falls dieser Link nicht funktioniert, bitten Sie The House um einen neuen privaten Link.", "Ne saisissez pas les données de passeport dans la conciergerie IA. Si ce lien ne fonctionne pas, demandez à The House d’émettre un nouveau lien privé.", "No pegues datos del pasaporte en la conserjería con IA. Si este enlace no funciona, pide a The House que emita un nuevo enlace privado.");
  add("Room {room}", "ห้อง {room}", "房间 {room}", "Номер {room}", "Zimmer {room}", "Chambre {room}", "Habitación {room}");
  add("Link expires: {date}", "ลิงก์หมดอายุ: {date}", "链接到期：{date}", "Ссылка действует до: {date}", "Link läuft ab: {date}", "Expiration du lien : {date}", "El enlace caduca: {date}");
  add("Automatic deletion: {days} days after upload", "ลบอัตโนมัติ: {days} วันหลังอัปโหลด", "自动删除：上传后 {days} 天", "Автоматическое удаление: через {days} дней после загрузки", "Automatische Löschung: {days} Tage nach dem Upload", "Suppression automatique : {days} jours après l’importation", "Eliminación automática: {days} días después de la subida");
  add("Automatic deletion: 14 days after upload", "ลบอัตโนมัติ: 14 วันหลังอัปโหลด", "自动删除：上传后 14 天", "Автоматическое удаление: через 14 дней после загрузки", "Automatische Löschung: 14 Tage nach dem Upload", "Suppression automatique : 14 jours après l’importation", "Eliminación automática: 14 días después de la subida");
  add("Your private link is valid. Choose the passport image when you are ready.", "ลิงก์ส่วนตัวของคุณใช้งานได้ เลือกภาพหนังสือเดินทางเมื่อพร้อม", "您的私人链接有效。准备好后请选择护照图片。", "Ваша личная ссылка действительна. Когда будете готовы, выберите изображение паспорта.", "Ihr privater Link ist gültig. Wählen Sie das Passbild aus, sobald Sie bereit sind.", "Votre lien privé est valide. Choisissez l’image du passeport lorsque vous êtes prêt(e).", "Tu enlace privado es válido. Elige la imagen del pasaporte cuando estés preparado/a.");
  add("This private link is missing or is not valid. Please ask The House for a new link.", "ไม่พบลิงก์ส่วนตัวนี้หรือลิงก์ไม่ถูกต้อง โปรดขอลิงก์ใหม่จาก The House", "此私人链接缺失或无效。请向 The House 索取新链接。", "Личная ссылка отсутствует или недействительна. Попросите The House предоставить новую.", "Dieser private Link fehlt oder ist ungültig. Bitte bitten Sie The House um einen neuen Link.", "Ce lien privé est absent ou invalide. Demandez un nouveau lien à The House.", "Este enlace privado no está disponible o no es válido. Pide a The House un enlace nuevo.");
  add("This private link has expired, has already been used or is not available. Please ask The House for a new link.", "ลิงก์ส่วนตัวนี้หมดอายุ ใช้ไปแล้ว หรือไม่พร้อมใช้งาน โปรดขอลิงก์ใหม่จาก The House", "此私人链接已过期、已使用或不可用。请向 The House 索取新链接。", "Эта личная ссылка истекла, уже использована или недоступна. Попросите The House предоставить новую.", "Dieser private Link ist abgelaufen, wurde bereits verwendet oder ist nicht verfügbar. Bitte bitten Sie The House um einen neuen Link.", "Ce lien privé a expiré, a déjà été utilisé ou n’est pas disponible. Demandez un nouveau lien à The House.", "Este enlace privado ha caducado, ya se ha utilizado o no está disponible. Pide a The House un enlace nuevo.");
  add("The image is larger than 10 MB. Please choose a smaller image.", "ภาพมีขนาดใหญ่กว่า 10 MB โปรดเลือกภาพที่เล็กกว่า", "图片超过 10 MB。请选择较小的图片。", "Размер изображения превышает 10 МБ. Выберите файл меньшего размера.", "Das Bild ist größer als 10 MB. Bitte wählen Sie ein kleineres Bild.", "L’image dépasse 10 Mo. Choisissez une image plus petite.", "La imagen supera los 10 MB. Elige una imagen más pequeña.");
  add("Uploading securely. Please keep this page open…", "กำลังอัปโหลดอย่างปลอดภัย โปรดเปิดหน้านี้ไว้…", "正在安全上传。请保持此页面打开…", "Идёт безопасная загрузка. Не закрывайте страницу…", "Sicherer Upload läuft. Bitte lassen Sie diese Seite geöffnet…", "Importation sécurisée en cours. Gardez cette page ouverte…", "Subiendo de forma segura. Mantén esta página abierta…");
  add("Thank you. The passport image for Room {room} was received securely. This one-time link is now closed.", "ขอบคุณ เราได้รับภาพหนังสือเดินทางสำหรับห้อง {room} อย่างปลอดภัยแล้ว ลิงก์แบบใช้ครั้งเดียวนี้ถูกปิดแล้ว", "谢谢。房间 {room} 的护照图片已安全收到。此一次性链接现已关闭。", "Спасибо. Изображение паспорта для номера {room} безопасно получено. Одноразовая ссылка закрыта.", "Vielen Dank. Das Passbild für Zimmer {room} wurde sicher empfangen. Dieser Einmal-Link ist nun geschlossen.", "Merci. L’image du passeport pour la chambre {room} a été reçue en toute sécurité. Ce lien à usage unique est maintenant fermé.", "Gracias. La imagen del pasaporte para la habitación {room} se ha recibido de forma segura. Este enlace de un solo uso ya está cerrado.");
  add("That file is not a supported passport image. Please choose a JPEG, PNG, WebP or HEIC image.", "ไฟล์นี้ไม่ใช่รูปแบบภาพหนังสือเดินทางที่รองรับ โปรดเลือกไฟล์ JPEG, PNG, WebP หรือ HEIC", "不支持该护照图片格式。请选择 JPEG、PNG、WebP 或 HEIC 图片。", "Этот формат изображения не поддерживается. Выберите JPEG, PNG, WebP или HEIC.", "Dieses Passbildformat wird nicht unterstützt. Bitte wählen Sie JPEG, PNG, WebP oder HEIC.", "Ce format d’image de passeport n’est pas pris en charge. Choisissez une image JPEG, PNG, WebP ou HEIC.", "Ese formato de imagen no es compatible. Elige una imagen JPEG, PNG, WebP o HEIC.");
  add("That image is incomplete or too small. Please choose a clear passport photo.", "ภาพไม่สมบูรณ์หรือมีขนาดเล็กเกินไป โปรดเลือกภาพหนังสือเดินทางที่ชัดเจน", "该图片不完整或过小。请选择清晰的护照照片。", "Изображение неполное или слишком маленькое. Выберите чёткую фотографию паспорта.", "Das Bild ist unvollständig oder zu klein. Bitte wählen Sie ein deutliches Passfoto.", "Cette image est incomplète ou trop petite. Choisissez une photo nette du passeport.", "La imagen está incompleta o es demasiado pequeña. Elige una foto nítida del pasaporte.");
  add("This private link has expired or has already been used. Please ask The House for a new link.", "ลิงก์ส่วนตัวนี้หมดอายุหรือถูกใช้ไปแล้ว โปรดขอลิงก์ใหม่จาก The House", "此私人链接已过期或已使用。请向 The House 索取新链接。", "Эта личная ссылка истекла или уже использована. Попросите The House предоставить новую.", "Dieser private Link ist abgelaufen oder wurde bereits verwendet. Bitte bitten Sie The House um einen neuen Link.", "Ce lien privé a expiré ou a déjà été utilisé. Demandez un nouveau lien à The House.", "Este enlace privado ha caducado o ya se ha utilizado. Pide a The House un enlace nuevo.");
  add("This private link has already been used. Please ask The House for a new link.", "ลิงก์ส่วนตัวนี้ถูกใช้ไปแล้ว โปรดขอลิงก์ใหม่จาก The House", "此私人链接已使用。请向 The House 索取新链接。", "Эта личная ссылка уже использована. Попросите The House предоставить новую.", "Dieser private Link wurde bereits verwendet. Bitte bitten Sie The House um einen neuen Link.", "Ce lien privé a déjà été utilisé. Demandez un nouveau lien à The House.", "Este enlace privado ya se ha utilizado. Pide a The House un enlace nuevo.");
  add("The image could not be uploaded securely. Please try again or ask The House for a new link.", "ไม่สามารถอัปโหลดภาพอย่างปลอดภัยได้ โปรดลองอีกครั้งหรือขอลิงก์ใหม่จาก The House", "无法安全上传图片。请重试或向 The House 索取新链接。", "Не удалось безопасно загрузить изображение. Повторите попытку или попросите The House предоставить новую ссылку.", "Das Bild konnte nicht sicher hochgeladen werden. Versuchen Sie es erneut oder bitten Sie The House um einen neuen Link.", "L’image n’a pas pu être importée de manière sécurisée. Réessayez ou demandez un nouveau lien à The House.", "No se pudo subir la imagen de forma segura. Inténtalo de nuevo o pide a The House un enlace nuevo.");

  function detectLanguage() {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (languageCodes.has(stored)) return stored;
    for (const candidate of navigator.languages || [navigator.language]) {
      const normalized = String(candidate || "").toLowerCase();
      if (normalized.startsWith("zh")) return "zh-CN";
      const short = normalized.split("-")[0];
      if (languageCodes.has(short)) return short;
    }
    return "en";
  }

  const language = detectLanguage();
  document.documentElement.lang = language;
  const cachedTranslations = (() => {
    try {
      return JSON.parse(window.localStorage.getItem(`${CACHE_PREFIX}${language}`) || "{}");
    } catch (_error) {
      return {};
    }
  })();
  const nodeState = new WeakMap();
  const attributeState = new WeakMap();
  const pending = new Map();
  let flushTimer = null;
  let flushRunning = false;
  let activeRequests = 0;
  let statusElement = null;

  function translationFor(source) {
    return dictionary.get(source)?.[language] || cachedTranslations[source] || "";
  }

  function format(source, values = {}) {
    let output = translationFor(source) || source;
    Object.entries(values).forEach(([key, value]) => {
      output = output.replaceAll(`{${key}}`, String(value));
    });
    return output;
  }

  function storeCache(additions) {
    Object.assign(cachedTranslations, additions);
    try {
      const keys = Object.keys(cachedTranslations);
      if (keys.length > 1200) keys.slice(0, keys.length - 1200).forEach((key) => delete cachedTranslations[key]);
      window.localStorage.setItem(`${CACHE_PREFIX}${language}`, JSON.stringify(cachedTranslations));
    } catch (_error) {
      // Translation remains available from the server cache if browser storage is full.
    }
  }

  function setStatus(active) {
    if (language === "en") return;
    if (!statusElement) {
      statusElement = document.createElement("div");
      statusElement.className = "language-translation-status";
      statusElement.setAttribute("role", "status");
      statusElement.setAttribute("aria-live", "polite");
      statusElement.dataset.i18nSkip = "true";
      statusElement.textContent = format("Translating this page…");
      document.body.appendChild(statusElement);
    }
    statusElement.classList.toggle("is-visible", active);
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  async function fetchTranslations(texts, attempt = 0) {
    const response = await fetch("/api/i18n/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language, page: location.pathname, texts })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(data.translations) || data.translations.length !== texts.length) {
      const retryableStatus = response.status === 429 || response.status >= 500;
      if (retryableStatus && attempt < MAX_REQUEST_RETRIES) {
        await wait(attempt === 0 ? 700 : 1600);
        return fetchTranslations(texts, attempt + 1);
      }
      throw new Error("Translation unavailable.");
    }
    return data;
  }

  async function requestTranslations(sources) {
    const unique = [...new Set(sources)].filter(Boolean);
    const result = {};
    const unresolved = [];
    unique.forEach((source) => {
      const translated = translationFor(source);
      if (translated) result[source] = translated;
      else unresolved.push(source);
    });
    if (language === "en" || !unresolved.length) return result;

    activeRequests += 1;
    setStatus(true);
    try {
      const data = await fetchTranslations(unresolved);
      unresolved.forEach((source, index) => {
        const translated = data.translations[index];
        if (typeof translated === "string" && translated.trim()) result[source] = translated;
      });
      const retryIndexes = Array.isArray(data.retryable)
        ? data.retryable.filter((index) => Number.isInteger(index) && index >= 0 && index < unresolved.length)
        : [];
      if (retryIndexes.length) {
        const retrySources = retryIndexes.map((index) => unresolved[index]);
        await wait(900);
        const retryData = await fetchTranslations(retrySources);
        retrySources.forEach((source, index) => {
          const translated = retryData.translations[index];
          if (typeof translated === "string" && translated.trim()) result[source] = translated;
        });
      }
      storeCache(result);
      return result;
    } finally {
      activeRequests -= 1;
      if (!activeRequests && !pending.size) window.setTimeout(() => setStatus(false), 220);
    }
  }

  function enqueue(source, apply) {
    if (!source || language === "en") return;
    const known = translationFor(source);
    if (known) {
      apply(known);
      return;
    }
    if (!pending.has(source)) pending.set(source, new Set());
    pending.get(source).add(apply);
    setStatus(true);
    window.clearTimeout(flushTimer);
    flushTimer = window.setTimeout(flush, 80);
  }

  async function flush() {
    if (flushRunning) return;
    flushRunning = true;
    flushTimer = null;
    try {
      while (pending.size) {
        const batch = [...pending.keys()].slice(0, 24);
        const callbacks = new Map(batch.map((source) => [source, pending.get(source)]));
        batch.forEach((source) => pending.delete(source));
        try {
          const translations = await requestTranslations(batch);
          batch.forEach((source) => {
            const translated = translations[source];
            if (!translated) return;
            callbacks.get(source)?.forEach((apply) => apply(translated));
          });
        } catch (_error) {
          // Keep the authoritative English source visible if translation is unavailable.
        }
      }
    } finally {
      flushRunning = false;
      if (pending.size) {
        window.clearTimeout(flushTimer);
        flushTimer = window.setTimeout(flush, 80);
      }
    }
    if (!activeRequests) window.setTimeout(() => setStatus(false), 220);
  }

  function skipped(element) {
    if (!element) return true;
    if (exploreContentDeferred && element.closest(".section,.footer")) return true;
    return Boolean(element.closest(
      "script,style,noscript,code,pre,textarea,input,select,[data-i18n-skip],.ai-concierge-message.is-guest"
    ));
  }

  function processTextNode(node) {
    const parent = node.parentElement;
    if (skipped(parent)) return;
    const current = node.nodeValue || "";
    const previous = nodeState.get(node);
    if (previous?.rendered === current) return;
    const source = current.trim();
    if (!source || !/[A-Za-z]/.test(source) || source.length > 1800) return;
    const prefix = current.slice(0, current.indexOf(source));
    const suffix = current.slice(current.indexOf(source) + source.length);
    const apply = (translated) => {
      const rendered = `${prefix}${translated}${suffix}`;
      nodeState.set(node, { source, rendered });
      if (node.nodeValue !== rendered) node.nodeValue = rendered;
    };
    enqueue(source, apply);
  }

  function processAttribute(element, name) {
    if (skipped(element) && !element.matches("input,textarea")) return;
    const current = element.getAttribute(name) || "";
    const state = attributeState.get(element) || {};
    if (state[name]?.rendered === current) return;
    if (!current || !/[A-Za-z]/.test(current) || current.length > 1800) return;
    const source = current.trim();
    if (!source) return;
    enqueue(source, (translated) => {
      state[name] = { source, rendered: translated };
      attributeState.set(element, state);
      if (element.getAttribute(name) !== translated) element.setAttribute(name, translated);
    });
  }

  function processRoot(root) {
    if (language === "en" || !root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      processTextNode(root);
      return;
    }
    if (!(root instanceof Element || root instanceof Document)) return;
    if (root instanceof Element) {
      ["placeholder", "aria-label", "title", "alt"].forEach((name) => processAttribute(root, name));
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) processTextNode(node);
    root.querySelectorAll?.("[placeholder],[aria-label],[title],[alt]").forEach((element) => {
      ["placeholder", "aria-label", "title", "alt"].forEach((name) => {
        if (element.hasAttribute(name)) processAttribute(element, name);
      });
    });
  }

  function addSelector() {
    if (document.querySelector(".language-switcher")) return;
    const host = document.querySelector(".topbar") || document.querySelector(".passport-brand");
    if (!host) return;
    const wrapper = document.createElement("label");
    wrapper.className = "language-switcher";
    wrapper.dataset.i18nSkip = "true";
    wrapper.innerHTML = `<span aria-hidden="true">🌐</span><span class="language-switcher-label">${format("Language")}</span>`;
    const select = document.createElement("select");
    select.setAttribute("aria-label", format("Choose language"));
    languages.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.code;
      option.textContent = item.label;
      option.selected = item.code === language;
      select.appendChild(option);
    });
    select.addEventListener("change", () => {
      if (!languageCodes.has(select.value)) return;
      window.localStorage.setItem(STORAGE_KEY, select.value);
      window.location.reload();
    });
    wrapper.appendChild(select);
    if (host.matches(".topbar")) {
      const nav = host.querySelector(".nav");
      if (nav) nav.appendChild(wrapper);
      else host.appendChild(wrapper);
    } else {
      host.appendChild(wrapper);
    }
  }

  function addMobileNavigation() {
    const topbar = document.querySelector(".topbar");
    const nav = topbar?.querySelector(".nav");
    if (!topbar || !nav || topbar.querySelector(".mobile-nav-toggle")) return;
    nav.id ||= "housePrimaryNavigation";
    const toggle = document.createElement("button");
    toggle.className = "mobile-nav-toggle";
    toggle.type = "button";
    toggle.dataset.i18nSkip = "true";
    toggle.setAttribute("aria-controls", nav.id);
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", format("Menu"));
    toggle.innerHTML = `<span aria-hidden="true">☰</span><span>${format("Menu")}</span>`;
    toggle.addEventListener("click", () => {
      const open = topbar.classList.toggle("is-nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    topbar.insertBefore(toggle, nav);
  }

  function addAlwaysVisibleLanguageButton() {
    const select = document.querySelector(".language-switcher select");
    if (!select || document.querySelector(".language-floating-button")) return;
    const button = document.createElement("button");
    button.className = "language-floating-button";
    button.type = "button";
    button.dataset.i18nSkip = "true";
    button.setAttribute("aria-label", format("Choose language"));
    button.innerHTML = `<span aria-hidden="true">🌐</span><span>${languages.find((item) => item.code === language)?.label || "English"}</span>`;
    button.addEventListener("click", () => {
      const topbar = document.querySelector(".topbar");
      topbar?.classList.add("is-nav-open");
      topbar?.querySelector(".mobile-nav-toggle")?.setAttribute("aria-expanded", "true");
      select.focus();
      if (typeof select.showPicker === "function") select.showPicker();
      else select.click();
    });
    document.body.appendChild(button);
  }

  function start() {
    addMobileNavigation();
    addSelector();
    addAlwaysVisibleLanguageButton();
    if (language !== "en") {
      processRoot(document.body);
      if (!exploreContentDeferred) {
        enqueue(document.title, (translation) => { document.title = translation; });
        const description = document.querySelector('meta[name="description"]');
        if (description) processAttribute(description, "content");
      }
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList") mutation.addedNodes.forEach(processRoot);
          else if (mutation.type === "characterData") processTextNode(mutation.target);
          else if (mutation.type === "attributes") processAttribute(mutation.target, mutation.attributeName);
        });
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["placeholder", "aria-label", "title", "alt"]
      });
    }
    window.dispatchEvent(new CustomEvent("house:i18n-ready", { detail: { language } }));
  }

  window.HOUSE_I18N = Object.freeze({
    language,
    languages,
    t: (source) => translationFor(source) || source,
    format,
    translateText: async (source) => (await requestTranslations([source]))[source] || source,
    translateBatch: async (sources) => {
      const translated = await requestTranslations(sources);
      return sources.map((source) => translated[source] || source);
    },
    localize: processRoot
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
