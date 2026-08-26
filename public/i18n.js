(function () {
  if (window.HOUSE_I18N) return;

  const STORAGE_KEY = "houseGuideLanguage";
  const CACHE_PREFIX = "houseGuideTranslations:v5.11.7:";
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

  // Reviewed stay-access wording for both Airbnb and direct/walk-in reservations.
  add("Verify your stay", "ยืนยันการเข้าพักของคุณ", "验证您的住宿", "Подтвердите проживание", "Aufenthalt verifizieren", "Vérifiez votre séjour", "Verifica tu estancia");
  add("Stay confirmation code", "รหัสยืนยันการเข้าพัก", "住宿确认码", "Код подтверждения проживания", "Aufenthaltsbestätigungscode", "Code de confirmation du séjour", "Código de confirmación de la estancia");
  add("Enter the Airbnb confirmation code shown in your trip details, or the private House stay code provided for a direct booking. This confirms that this permanent link belongs to your booked room.", "กรอกรหัสยืนยัน Airbnb ที่แสดงในรายละเอียดการเดินทาง หรือรหัสเข้าพักส่วนตัวของ The House ที่ได้รับสำหรับการจองโดยตรง ข้อมูลนี้ยืนยันว่าลิงก์ถาวรนี้เป็นของห้องที่คุณจองไว้", "输入行程详情中显示的 Airbnb 确认码，或直接预订时提供给您的 The House 私人住宿码。这样可确认此固定链接属于您预订的房间。", "Введите код подтверждения Airbnb из сведений о поездке или частный код проживания The House, выданный при прямом бронировании. Это подтверждает, что постоянная ссылка относится к забронированному вами номеру.", "Geben Sie den Airbnb-Bestätigungscode aus Ihren Reisedetails oder den privaten House-Aufenthaltscode für eine Direktbuchung ein. Damit wird bestätigt, dass dieser dauerhafte Link zu Ihrem gebuchten Zimmer gehört.", "Saisissez le code de confirmation Airbnb indiqué dans les détails de votre voyage ou le code privé de séjour The House fourni pour une réservation directe. Cela confirme que ce lien permanent correspond à votre chambre réservée.", "Introduce el código de confirmación de Airbnb que aparece en los detalles del viaje o el código privado de estancia de The House facilitado para una reserva directa. Esto confirma que este enlace permanente corresponde a tu habitación reservada.");
  add("Verifying your stay…", "กำลังยืนยันการเข้าพักของคุณ…", "正在验证您的住宿…", "Проверяем проживание…", "Aufenthalt wird geprüft…", "Vérification de votre séjour…", "Verificando tu estancia…");
  add("Your stay is verified. Please complete the guest registration step below.", "ยืนยันการเข้าพักของคุณแล้ว โปรดดำเนินการลงทะเบียนผู้เข้าพักด้านล่างให้เสร็จสิ้น", "您的住宿已验证。请完成下方的住客登记步骤。", "Проживание подтверждено. Завершите регистрацию гостей ниже.", "Ihr Aufenthalt ist verifiziert. Bitte schließen Sie unten die Gästeregistrierung ab.", "Votre séjour est vérifié. Veuillez terminer l’enregistrement des voyageurs ci-dessous.", "Tu estancia está verificada. Completa a continuación el registro de huéspedes.");
  add("That confirmation code does not match an active or upcoming reservation for this Room link. Check the HM code shown in your Airbnb trip details or the private House stay code provided to you, then try again.", "รหัสยืนยันไม่ตรงกับการจองที่กำลังเข้าพักหรือกำลังจะมาถึงสำหรับลิงก์ห้องนี้ โปรดตรวจสอบรหัส HM ในรายละเอียดการเดินทาง Airbnb หรือรหัสเข้าพักส่วนตัวของ The House ที่ได้รับ แล้วลองอีกครั้ง", "该确认码与此房间链接的当前或即将开始的预订不匹配。请检查 Airbnb 行程详情中的 HM 代码或提供给您的 The House 私人住宿码，然后重试。", "Код не соответствует текущему или предстоящему бронированию для этой ссылки на номер. Проверьте код HM в Airbnb или выданный вам частный код проживания The House и повторите попытку.", "Dieser Code stimmt mit keiner aktiven oder bevorstehenden Reservierung für diesen Zimmerlink überein. Prüfen Sie den HM-Code in Airbnb oder den Ihnen mitgeteilten privaten House-Aufenthaltscode und versuchen Sie es erneut.", "Ce code ne correspond à aucune réservation active ou à venir pour ce lien de chambre. Vérifiez le code HM dans Airbnb ou le code privé de séjour The House qui vous a été fourni, puis réessayez.", "Este código no coincide con ninguna reserva activa o próxima para este enlace de habitación. Comprueba el código HM de Airbnb o el código privado de estancia de The House que te facilitaron e inténtalo de nuevo.");
  add("Re-enter the stay confirmation code for your verified active stay before continuing.", "กรอกรหัสยืนยันการเข้าพักสำหรับการเข้าพักที่กำลังดำเนินอยู่และได้รับการยืนยันอีกครั้งก่อนดำเนินการต่อ", "继续前，请重新输入已验证且当前有效住宿的确认码。", "Перед продолжением повторно введите код подтверждения вашего проверенного текущего проживания.", "Geben Sie vor dem Fortfahren den Aufenthaltsbestätigungscode Ihres verifizierten aktiven Aufenthalts erneut ein.", "Avant de continuer, saisissez à nouveau le code de confirmation de votre séjour actif vérifié.", "Antes de continuar, vuelve a introducir el código de confirmación de tu estancia activa verificada.");
  add("That confirmation code does not match your verified active stay. Check the Airbnb HM code or private House stay code provided to you, then try again.", "รหัสยืนยันนั้นไม่ตรงกับการเข้าพักที่กำลังดำเนินอยู่และได้รับการยืนยันของคุณ โปรดตรวจสอบรหัส HM ของ Airbnb หรือรหัสเข้าพักส่วนตัวของ The House ที่ได้รับ แล้วลองอีกครั้ง", "该确认码与您已验证且当前有效的住宿不匹配。请检查 Airbnb HM 代码或提供给您的 The House 私人住宿码，然后重试。", "Код не соответствует вашему проверенному текущему проживанию. Проверьте код HM Airbnb или выданный вам частный код проживания The House и повторите попытку.", "Dieser Code stimmt nicht mit Ihrem verifizierten aktiven Aufenthalt überein. Prüfen Sie den Airbnb-HM-Code oder den Ihnen mitgeteilten privaten House-Aufenthaltscode und versuchen Sie es erneut.", "Ce code ne correspond pas à votre séjour actif vérifié. Vérifiez le code HM Airbnb ou le code privé de séjour The House qui vous a été fourni, puis réessayez.", "Este código no coincide con tu estancia activa verificada. Comprueba el código HM de Airbnb o el código privado de estancia de The House que te facilitaron e inténtalo de nuevo.");
  add("Re-enter your stay confirmation code before the key-box code can be released. This fresh check is used only for this lost-key request.", "กรอกรหัสยืนยันการเข้าพักของคุณอีกครั้งก่อนแสดงรหัสกล่องกุญแจ การตรวจสอบใหม่นี้ใช้เฉพาะคำขอกุญแจหายครั้งนี้เท่านั้น", "在提供钥匙盒密码前，请重新输入住宿确认码。此次重新验证仅用于本次钥匙遗失请求。", "Перед выдачей кода сейфа для ключа повторно введите код подтверждения проживания. Эта повторная проверка используется только для данного запроса об утерянном ключе.", "Geben Sie Ihren Aufenthaltsbestätigungscode erneut ein, bevor der Schlüsselkasten-Code freigegeben werden kann. Diese erneute Prüfung gilt nur für diese Anfrage wegen eines verlorenen Schlüssels.", "Saisissez à nouveau votre code de confirmation de séjour avant que le code de la boîte à clés puisse être communiqué. Cette nouvelle vérification sert uniquement à cette demande de clé perdue.", "Vuelve a introducir el código de confirmación de tu estancia antes de que se muestre el código de la caja de llaves. Esta nueva comprobación se usa únicamente para esta solicitud por pérdida de llave.");
  add("Stay confirmation code for this lost-key request", "รหัสยืนยันการเข้าพักสำหรับคำขอกุญแจหายครั้งนี้", "本次钥匙遗失请求的住宿确认码", "Код подтверждения проживания для запроса об утерянном ключе", "Aufenthaltsbestätigungscode für diese Anfrage wegen eines verlorenen Schlüssels", "Code de confirmation de séjour pour cette demande de clé perdue", "Código de confirmación de estancia para esta solicitud por pérdida de llave");
  add("Re-enter the Airbnb HM code or private House stay code provided to you.", "กรอกรหัส HM ของ Airbnb หรือรหัสเข้าพักส่วนตัวของ The House ที่ได้รับอีกครั้ง", "请重新输入 Airbnb HM 代码或提供给您的 The House 私人住宿码。", "Повторно введите код HM Airbnb или выданный вам частный код проживания The House.", "Geben Sie den Airbnb-HM-Code oder den Ihnen mitgeteilten privaten House-Aufenthaltscode erneut ein.", "Saisissez à nouveau le code HM Airbnb ou le code privé de séjour The House qui vous a été fourni.", "Vuelve a introducir el código HM de Airbnb o el código privado de estancia de The House que te facilitaron.");

  // Reviewed maintenance-reporting interface. These strings remain local so the urgent workflow never depends on live translation.
  [
    ["Report a Problem", "แจ้งปัญหา", "报告问题", "Сообщить о проблеме", "Problem melden", "Signaler un problème", "Informar de un problema"],
    ["Tell us about water, toilet, AC, electricity, TV or another room issue.", "แจ้งปัญหาเกี่ยวกับน้ำ ห้องน้ำ เครื่องปรับอากาศ ไฟฟ้า ทีวี หรือปัญหาอื่นในห้อง", "告诉我们房间内的水、厕所、空调、电力、电视或其他问题。", "Сообщите о проблеме с водой, туалетом, кондиционером, электричеством, телевизором или другой неполадке в номере.", "Melden Sie Probleme mit Wasser, Toilette, Klimaanlage, Strom, Fernseher oder andere Zimmerprobleme.", "Signalez un problème d’eau, de toilettes, de climatisation, d’électricité, de télévision ou autre dans la chambre.", "Infórmanos de problemas con el agua, el inodoro, el aire acondicionado, la electricidad, el televisor u otra incidencia de la habitación."],
    ["ROOM-SPECIFIC SUPPORT", "ความช่วยเหลือเฉพาะห้อง", "客房专属支持", "ПОМОЩЬ ПО НОМЕРУ", "ZIMMERBEZOGENE HILFE", "ASSISTANCE POUR LA CHAMBRE", "ASISTENCIA PARA LA HABITACIÓN"],
    ["Tell us what happened in your room. Routine reports go to our House team. Serious water, electrical or security problems alert the urgent team.", "แจ้งให้เราทราบว่าเกิดอะไรขึ้นในห้องของคุณ เรื่องทั่วไปจะส่งไปยังทีมดูแลที่พัก ส่วนปัญหาน้ำ ไฟฟ้า หรือความปลอดภัยที่ร้ายแรงจะแจ้งทีมเร่งด่วน", "请告诉我们房间里发生了什么。一般问题会交给住宿团队；严重的水、电气或安全问题会通知紧急团队。", "Расскажите, что произошло в номере. Обычные заявки получает команда объекта, а серьёзные проблемы с водой, электричеством или безопасностью — срочная команда.", "Teilen Sie uns mit, was in Ihrem Zimmer passiert ist. Normale Meldungen gehen an unser House-Team; ernste Wasser-, Elektro- oder Sicherheitsprobleme an das Dringlichkeitsteam.", "Indiquez-nous ce qui s’est passé dans votre chambre. Les demandes courantes vont à notre équipe ; les problèmes graves d’eau, d’électricité ou de sécurité alertent l’équipe d’urgence.", "Cuéntanos qué ha ocurrido en tu habitación. Los avisos habituales van al equipo del alojamiento; los problemas graves de agua, electricidad o seguridad alertan al equipo urgente."],
    ["Checking your room…", "กำลังตรวจสอบห้องของคุณ…", "正在确认您的房间…", "Проверяем ваш номер…", "Ihr Zimmer wird geprüft…", "Vérification de votre chambre…", "Comprobando tu habitación…"],
    ["Report for Room {room}", "แจ้งปัญหาสำหรับห้อง {room}", "房间 {room} 的报告", "Заявка для номера {room}", "Meldung für Zimmer {room}", "Signalement pour la chambre {room}", "Aviso para la habitación {room}"],
    ["🚽 Please protect the toilet", "🚽 โปรดช่วยดูแลโถสุขภัณฑ์", "🚽 请正确使用厕所", "🚽 Берегите туалет", "🚽 Bitte schützen Sie die Toilette", "🚽 Merci de préserver les toilettes", "🚽 Ayúdanos a cuidar el inodoro"],
    ["Only human waste may be flushed. Toilet paper, tissues, wipes, sanitary products and every other item must go in the bin provided.", "ทิ้งลงโถสุขภัณฑ์ได้เฉพาะของเสียจากร่างกายเท่านั้น กระดาษชำระ กระดาษทิชชู ทิชชูเปียก ผลิตภัณฑ์สุขอนามัย และสิ่งของอื่นทั้งหมดต้องทิ้งในถังที่จัดไว้", "只能冲走人体排泄物。卫生纸、纸巾、湿巾、卫生用品和所有其他物品必须放入所提供的垃圾桶。", "Смывать можно только продукты жизнедеятельности. Туалетную бумагу, салфетки, влажные салфетки, средства гигиены и любые другие предметы следует выбрасывать в предоставленную корзину.", "Nur menschliche Ausscheidungen dürfen heruntergespült werden. Toilettenpapier, Taschentücher, Feuchttücher, Hygieneartikel und alle anderen Gegenstände gehören in den bereitgestellten Mülleimer.", "Seuls les déchets corporels peuvent être évacués dans les toilettes. Le papier toilette, les mouchoirs, les lingettes, les protections hygiéniques et tout autre objet doivent être jetés dans la poubelle fournie.", "Solo se pueden tirar al inodoro los residuos humanos. El papel higiénico, pañuelos, toallitas, productos sanitarios y cualquier otro objeto deben depositarse en la papelera."],
    ["If inspection confirms that paper, tissues or another prohibited item caused a blockage, a 1,000 THB clearance fee applies.", "หากตรวจสอบแล้วพบว่ากระดาษ ทิชชู หรือสิ่งของต้องห้ามอื่นทำให้ท่ออุดตัน จะมีค่าดำเนินการแก้ไข 1,000 บาท", "如果检查确认堵塞是由卫生纸、纸巾或其他禁止物品造成，将收取 1,000 泰铢疏通费。", "Если проверка подтвердит, что засор вызван бумагой, салфетками или другим запрещённым предметом, взимается плата за прочистку 1 000 THB.", "Wenn die Überprüfung bestätigt, dass Papier, Taschentücher oder ein anderer unzulässiger Gegenstand die Verstopfung verursacht hat, fällt eine Reinigungsgebühr von 1.000 THB an.", "Si le contrôle confirme que du papier, des mouchoirs ou un autre objet interdit a causé l’obstruction, des frais de débouchage de 1 000 THB s’appliquent.", "Si la inspección confirma que el atasco fue causado por papel, pañuelos u otro objeto prohibido, se aplicará un cargo de desatasco de 1.000 THB."],
    ["1. What needs attention?", "1. ต้องการให้เราดูแลเรื่องใด", "1. 哪个问题需要处理？", "1. Что требует внимания?", "1. Was muss behoben werden?", "1. Quel problème doit être traité ?", "1. ¿Qué necesita atención?"],
    ["2. Choose the closest description", "2. เลือกคำอธิบายที่ใกล้เคียงที่สุด", "2. 请选择最接近的描述", "2. Выберите наиболее подходящее описание", "2. Wählen Sie die passendste Beschreibung", "2. Choisissez la description la plus proche", "2. Elige la descripción más adecuada"],
    ["3. Add useful details", "3. เพิ่มรายละเอียดที่เป็นประโยชน์", "3. 添加有用的详细信息", "3. Добавьте полезные сведения", "3. Nützliche Angaben hinzufügen", "3. Ajoutez des détails utiles", "3. Añade detalles útiles"],
    ["Water leak or flooding", "น้ำรั่วหรือน้ำท่วม", "漏水或积水", "Протечка или затопление", "Wasserleck oder Überflutung", "Fuite d’eau ou inondation", "Fuga de agua o inundación"],
    ["Toilet", "โถสุขภัณฑ์", "厕所", "Туалет", "Toilette", "Toilettes", "Inodoro"],
    ["Water or shower", "น้ำหรือฝักบัว", "供水或淋浴", "Вода или душ", "Wasser oder Dusche", "Eau ou douche", "Agua o ducha"],
    ["Air conditioning", "เครื่องปรับอากาศ", "空调", "Кондиционер", "Klimaanlage", "Climatisation", "Aire acondicionado"],
    ["Electricity", "ไฟฟ้า", "电力", "Электричество", "Strom", "Électricité", "Electricidad"],
    ["Door or security", "ประตูหรือความปลอดภัย", "门或安全问题", "Дверь или безопасность", "Tür oder Sicherheit", "Porte ou sécurité", "Puerta o seguridad"],
    ["TV", "ทีวี", "电视", "Телевизор", "Fernseher", "Télévision", "Televisor"],
    ["Refrigerator", "ตู้เย็น", "冰箱", "Холодильник", "Kühlschrank", "Réfrigérateur", "Frigorífico"],
    ["Fan", "พัดลม", "风扇", "Вентилятор", "Ventilator", "Ventilateur", "Ventilador"],
    ["Wi-Fi", "Wi-Fi", "Wi-Fi", "Wi‑Fi", "WLAN", "Wi-Fi", "Wi-Fi"],
    ["Furniture or fixture", "เฟอร์นิเจอร์หรืออุปกรณ์ติดตั้ง", "家具或固定设施", "Мебель или оборудование", "Möbel oder Ausstattung", "Mobilier ou équipement", "Mueble o instalación"],
    ["Other issue", "ปัญหาอื่น", "其他问题", "Другая проблема", "Anderes Problem", "Autre problème", "Otro problema"],
    ["Other issue — tell us what happened", "ปัญหาอื่น — แจ้งให้เราทราบว่าเกิดอะไรขึ้น", "其他问题——请告诉我们发生了什么", "Другая проблема — расскажите, что произошло", "Anderes Problem — teilen Sie uns mit, was passiert ist", "Autre problème — indiquez-nous ce qui s’est passé", "Otro problema: cuéntanos qué ha ocurrido"],
    ["Active leak, flooding or water from the ceiling", "มีน้ำรั่ว น้ำท่วม หรือน้ำไหลจากเพดาน", "正在漏水、积水或天花板滴水", "Активная протечка, затопление или вода с потолка", "Aktives Leck, Überflutung oder Wasser von der Decke", "Fuite active, inondation ou eau venant du plafond", "Fuga activa, inundación o agua del techo"],
    ["Toilet is clogged", "โถสุขภัณฑ์อุดตัน", "厕所堵塞", "Туалет засорён", "Toilette ist verstopft", "Les toilettes sont bouchées", "El inodoro está atascado"],
    ["Toilet is overflowing", "น้ำล้นโถสุขภัณฑ์", "厕所溢水", "Туалет переполняется", "Toilette läuft über", "Les toilettes débordent", "El inodoro se desborda"],
    ["Toilet will not flush", "โถสุขภัณฑ์กดน้ำไม่ได้", "厕所无法冲水", "Туалет не смывает", "Toilette spült nicht", "La chasse d’eau ne fonctionne pas", "El inodoro no descarga"],
    ["Toilet keeps running or is leaking", "น้ำในโถสุขภัณฑ์ไหลไม่หยุดหรือมีน้ำรั่ว", "马桶持续流水或漏水", "Вода в туалете не перестаёт течь или есть протечка", "Toilette läuft ständig oder ist undicht", "L’eau coule en continu ou les toilettes fuient", "El inodoro no deja de correr o tiene una fuga"],
    ["No water", "ไม่มีน้ำ", "没有水", "Нет воды", "Kein Wasser", "Pas d’eau", "No hay agua"],
    ["Low water pressure", "แรงดันน้ำต่ำ", "水压低", "Слабый напор воды", "Niedriger Wasserdruck", "Faible pression d’eau", "Baja presión de agua"],
    ["No hot water", "ไม่มีน้ำร้อน", "没有热水", "Нет горячей воды", "Kein Warmwasser", "Pas d’eau chaude", "No hay agua caliente"],
    ["Shower or tap is broken", "ฝักบัวหรือก๊อกน้ำเสีย", "淋浴或水龙头损坏", "Сломан душ или кран", "Dusche oder Wasserhahn ist defekt", "Douche ou robinet cassé", "Ducha o grifo averiado"],
    ["Drain problem", "ปัญหาท่อระบายน้ำ", "排水问题", "Проблема со сливом", "Abflussproblem", "Problème d’évacuation", "Problema de desagüe"],
    ["AC is not cooling", "เครื่องปรับอากาศไม่เย็น", "空调不制冷", "Кондиционер не охлаждает", "Klimaanlage kühlt nicht", "La climatisation ne refroidit pas", "El aire acondicionado no enfría"],
    ["AC is leaking", "เครื่องปรับอากาศมีน้ำรั่ว", "空调漏水", "Кондиционер протекает", "Klimaanlage ist undicht", "La climatisation fuit", "El aire acondicionado gotea"],
    ["AC is unusually noisy", "เครื่องปรับอากาศมีเสียงดังผิดปกติ", "空调异常嘈杂", "Кондиционер необычно шумит", "Klimaanlage ist ungewöhnlich laut", "La climatisation fait un bruit inhabituel", "El aire acondicionado hace un ruido inusual"],
    ["AC will not turn on", "เครื่องปรับอากาศเปิดไม่ติด", "空调无法开启", "Кондиционер не включается", "Klimaanlage lässt sich nicht einschalten", "La climatisation ne s’allume pas", "El aire acondicionado no se enciende"],
    ["No power", "ไฟฟ้าดับ", "停电", "Нет электричества", "Kein Strom", "Pas d’électricité", "No hay electricidad"],
    ["Light is not working", "ไฟไม่ทำงาน", "灯不亮", "Не работает свет", "Licht funktioniert nicht", "La lumière ne fonctionne pas", "La luz no funciona"],
    ["Socket or switch problem", "ปัญหาปลั๊กไฟหรือสวิตช์", "插座或开关问题", "Проблема с розеткой или выключателем", "Problem mit Steckdose oder Schalter", "Problème de prise ou d’interrupteur", "Problema con un enchufe o interruptor"],
    ["Sparks, smoke, burning smell or exposed wiring", "มีประกายไฟ ควัน กลิ่นไหม้ หรือสายไฟเปลือย", "火花、烟雾、焦味或裸露电线", "Искры, дым, запах гари или оголённая проводка", "Funken, Rauch, Brandgeruch oder offene Kabel", "Étincelles, fumée, odeur de brûlé ou fils dénudés", "Chispas, humo, olor a quemado o cables expuestos"],
    ["Door, lock or handle is damaged", "ประตู กลอน หรือลูกบิดเสียหาย", "门、锁或把手损坏", "Повреждены дверь, замок или ручка", "Tür, Schloss oder Griff ist beschädigt", "Porte, serrure ou poignée endommagée", "Puerta, cerradura o manilla dañada"],
    ["The room cannot be secured", "ไม่สามารถล็อกห้องให้ปลอดภัยได้", "房间无法安全上锁", "Номер невозможно запереть", "Das Zimmer kann nicht gesichert werden", "La chambre ne peut pas être sécurisée", "La habitación no se puede asegurar"],
    ["Window problem", "ปัญหาหน้าต่าง", "窗户问题", "Проблема с окном", "Fensterproblem", "Problème de fenêtre", "Problema con una ventana"],
    ["TV will not turn on", "ทีวีเปิดไม่ติด", "电视无法开启", "Телевизор не включается", "Fernseher lässt sich nicht einschalten", "La télévision ne s’allume pas", "El televisor no se enciende"],
    ["No TV signal", "ทีวีไม่มีสัญญาณ", "电视无信号", "Нет телевизионного сигнала", "Kein Fernsehsignal", "Aucun signal TV", "No hay señal de TV"],
    ["Remote control problem", "ปัญหารีโมท", "遥控器问题", "Проблема с пультом", "Problem mit der Fernbedienung", "Problème de télécommande", "Problema con el mando"],
    ["TV appears damaged", "ทีวีดูเหมือนเสียหาย", "电视似乎损坏", "Телевизор повреждён", "Fernseher scheint beschädigt", "La télévision semble endommagée", "El televisor parece dañado"],
    ["Refrigerator is not cooling", "ตู้เย็นไม่เย็น", "冰箱不制冷", "Холодильник не охлаждает", "Kühlschrank kühlt nicht", "Le réfrigérateur ne refroidit pas", "El frigorífico no enfría"],
    ["Refrigerator is leaking", "ตู้เย็นมีน้ำรั่ว", "冰箱漏水", "Холодильник протекает", "Kühlschrank ist undicht", "Le réfrigérateur fuit", "El frigorífico tiene una fuga"],
    ["Refrigerator is unusually noisy", "ตู้เย็นมีเสียงดังผิดปกติ", "冰箱异常嘈杂", "Холодильник необычно шумит", "Kühlschrank ist ungewöhnlich laut", "Le réfrigérateur fait un bruit inhabituel", "El frigorífico hace un ruido inusual"],
    ["Refrigerator has no power", "ตู้เย็นไม่มีไฟ", "冰箱无电", "Холодильник не получает питание", "Kühlschrank hat keinen Strom", "Le réfrigérateur n’est pas alimenté", "El frigorífico no tiene corriente"],
    ["Fan problem", "ปัญหาพัดลม", "风扇问题", "Проблема с вентилятором", "Problem mit dem Ventilator", "Problème de ventilateur", "Problema con el ventilador"],
    ["Wi-Fi problem", "ปัญหา Wi-Fi", "Wi-Fi 问题", "Проблема с Wi‑Fi", "WLAN-Problem", "Problème de Wi-Fi", "Problema de Wi-Fi"],
    ["Furniture is damaged", "เฟอร์นิเจอร์เสียหาย", "家具损坏", "Повреждена мебель", "Möbel sind beschädigt", "Mobilier endommagé", "Mueble dañado"],
    ["A room fixture is damaged", "อุปกรณ์ติดตั้งในห้องเสียหาย", "房间固定设施损坏", "Повреждено оборудование номера", "Zimmereinrichtung ist beschädigt", "Un équipement de la chambre est endommagé", "Una instalación de la habitación está dañada"],
    ["Conditional toilet-clearance fee", "ค่าดำเนินการแก้ไขห้องน้ำแบบมีเงื่อนไข", "有条件收取的厕所疏通费", "Условная плата за прочистку туалета", "Bedingte Toiletten-Reinigungsgebühr", "Frais conditionnels de débouchage", "Cargo condicional por desatasco"],
    ["I understand that a 1,000 THB clearance fee will be added only if inspection confirms that paper, tissues or another prohibited item caused the blockage.", "ฉันเข้าใจว่าจะมีค่าดำเนินการ 1,000 บาทเฉพาะเมื่อการตรวจสอบยืนยันว่ากระดาษ ทิชชู หรือสิ่งของต้องห้ามอื่นเป็นสาเหตุของการอุดตัน", "我明白，只有在检查确认堵塞由卫生纸、纸巾或其他禁止物品造成时，才会收取 1,000 泰铢疏通费。", "Я понимаю, что плата 1 000 THB будет начислена только если проверка подтвердит, что засор вызван бумагой, салфетками или другим запрещённым предметом.", "Ich verstehe, dass die Gebühr von 1.000 THB nur berechnet wird, wenn die Überprüfung bestätigt, dass Papier, Taschentücher oder ein anderer unzulässiger Gegenstand die Verstopfung verursacht hat.", "Je comprends que les frais de 1 000 THB ne seront ajoutés que si le contrôle confirme que du papier, des mouchoirs ou un autre objet interdit a causé l’obstruction.", "Entiendo que el cargo de 1.000 THB solo se añadirá si la inspección confirma que el atasco fue causado por papel, pañuelos u otro objeto prohibido."],
    ["Tell us what happened.", "แจ้งให้เราทราบว่าเกิดอะไรขึ้น", "请告诉我们发生了什么。", "Расскажите, что произошло.", "Teilen Sie uns mit, was passiert ist.", "Indiquez-nous ce qui s’est passé.", "Cuéntanos qué ha ocurrido."],
    ["Add one photo (optional)", "เพิ่มรูปภาพ 1 รูป (ไม่บังคับ)", "添加一张照片（可选）", "Добавить одно фото (необязательно)", "Ein Foto hinzufügen (optional)", "Ajouter une photo (facultatif)", "Añadir una foto (opcional)"],
    ["Phone or WhatsApp number for a quick reply", "หมายเลขโทรศัพท์หรือ WhatsApp เพื่อให้ตอบกลับได้รวดเร็ว", "用于快速回复的电话或 WhatsApp 号码", "Телефон или WhatsApp для быстрого ответа", "Telefon- oder WhatsApp-Nummer für eine schnelle Rückmeldung", "Numéro de téléphone ou WhatsApp pour une réponse rapide", "Teléfono o WhatsApp para responder rápidamente"],
    ["Required for serious water, electrical, overflow or room-security emergencies. It is shared only with the team handling this report.", "จำเป็นสำหรับเหตุฉุกเฉินร้ายแรงเกี่ยวกับน้ำ ไฟฟ้า น้ำล้น หรือความปลอดภัยของห้อง และจะแชร์เฉพาะกับทีมที่ดูแลรายงานนี้", "严重漏水、电气、溢水或房间安全紧急情况必须填写。仅与处理此报告的团队共享。", "Обязательно при серьёзных проблемах с водой, электричеством, переполнением или безопасностью номера. Контакт передаётся только команде, обрабатывающей заявку.", "Bei ernsten Wasser-, Elektro-, Überlauf- oder Zimmersicherheitsproblemen erforderlich. Die Nummer wird nur mit dem zuständigen Team geteilt.", "Obligatoire pour les urgences graves liées à l’eau, à l’électricité, à un débordement ou à la sécurité de la chambre. Il est communiqué uniquement à l’équipe chargée du signalement.", "Obligatorio para emergencias graves de agua, electricidad, desbordamiento o seguridad de la habitación. Solo se comparte con el equipo que gestiona el aviso."],
    ["Include the country code, for example +66…", "ใส่รหัสประเทศ เช่น +66…", "请包含国家代码，例如 +66…", "Укажите код страны, например +66…", "Mit Landesvorwahl, zum Beispiel +66…", "Indiquez l’indicatif du pays, par exemple +66…", "Incluye el prefijo del país, por ejemplo +66…"],
    ["Send report", "ส่งรายงาน", "发送报告", "Отправить заявку", "Meldung senden", "Envoyer le signalement", "Enviar aviso"],
    ["Back to room guide", "กลับไปที่คู่มือห้อง", "返回房间指南", "Вернуться к путеводителю по номеру", "Zurück zum Zimmerleitfaden", "Retour au guide de la chambre", "Volver a la guía de la habitación"],
    ["Sending your report…", "กำลังส่งรายงาน…", "正在发送报告…", "Отправляем заявку…", "Meldung wird gesendet…", "Envoi du signalement…", "Enviando el aviso…"],
    ["Thank you. Your report has been recorded.", "ขอบคุณ เราบันทึกรายงานของคุณแล้ว", "谢谢。您的报告已记录。", "Спасибо. Ваша заявка зарегистрирована.", "Vielen Dank. Ihre Meldung wurde erfasst.", "Merci. Votre signalement a été enregistré.", "Gracias. Tu aviso ha quedado registrado."],
    ["Your report has been sent to our House team.", "รายงานของคุณถูกส่งไปยังทีมดูแลที่พักแล้ว", "您的报告已发送给住宿团队。", "Ваша заявка отправлена команде объекта.", "Ihre Meldung wurde an unser House-Team gesendet.", "Votre signalement a été envoyé à notre équipe.", "Tu aviso se ha enviado al equipo del alojamiento."],
    ["This serious report has been sent to the urgent team. Move away from immediate danger and use Help & Emergency if anyone is at risk.", "รายงานร้ายแรงนี้ถูกส่งไปยังทีมเร่งด่วนแล้ว โปรดออกห่างจากอันตรายทันที และใช้หน้าความช่วยเหลือและเหตุฉุกเฉินหากมีผู้ใดตกอยู่ในความเสี่ยง", "此严重问题已发送给紧急团队。请远离眼前危险；如有人面临风险，请使用“帮助与紧急情况”。", "Срочная заявка отправлена команде. Отойдите от непосредственной опасности и откройте раздел «Помощь и экстренные случаи», если кто-либо находится под угрозой.", "Diese ernste Meldung wurde an das Dringlichkeitsteam gesendet. Entfernen Sie sich aus unmittelbarer Gefahr und nutzen Sie „Hilfe & Notfall“, wenn jemand gefährdet ist.", "Ce signalement grave a été envoyé à l’équipe d’urgence. Éloignez-vous du danger immédiat et utilisez « Aide et urgence » si quelqu’un est en danger.", "Este aviso grave se ha enviado al equipo urgente. Aléjate del peligro inmediato y utiliza «Ayuda y emergencia» si alguien está en riesgo."],
    ["Please add a phone or WhatsApp number so the urgent team can reply quickly.", "โปรดเพิ่มหมายเลขโทรศัพท์หรือ WhatsApp เพื่อให้ทีมเร่งด่วนตอบกลับได้รวดเร็ว", "请填写电话或 WhatsApp 号码，以便紧急团队快速回复。", "Укажите телефон или WhatsApp, чтобы срочная команда могла быстро ответить.", "Bitte geben Sie eine Telefon- oder WhatsApp-Nummer an, damit das Dringlichkeitsteam schnell antworten kann.", "Ajoutez un numéro de téléphone ou WhatsApp afin que l’équipe d’urgence puisse répondre rapidement.", "Añade un teléfono o WhatsApp para que el equipo urgente pueda responder rápidamente."],
    ["Please acknowledge the conditional toilet-clearance fee before sending.", "โปรดยืนยันว่าคุณรับทราบค่าดำเนินการแก้ไขโถสุขภัณฑ์แบบมีเงื่อนไขก่อนส่ง", "提交前，请确认您已知悉有条件收取的厕所疏通费。", "Перед отправкой подтвердите, что вы ознакомились с условной платой за прочистку туалета.", "Bitte bestätigen Sie vor dem Senden, dass Sie die bedingte Gebühr für die Toilettenreinigung zur Kenntnis genommen haben.", "Avant l’envoi, veuillez confirmer que vous avez pris connaissance des frais conditionnels de débouchage des toilettes.", "Antes de enviar, confirma que has leído el aviso sobre el cargo condicional por desatascar el inodoro."],
    ["Please tell us what happened.", "โปรดบอกเราว่าเกิดอะไรขึ้น", "请告诉我们发生了什么。", "Расскажите, что произошло.", "Bitte teilen Sie uns mit, was passiert ist.", "Veuillez nous indiquer ce qui s’est passé.", "Cuéntanos qué ha ocurrido."],
    ["The photo is larger than 10 MB. Please choose a smaller image.", "รูปภาพมีขนาดเกิน 10 MB โปรดเลือกรูปที่มีขนาดเล็กกว่า", "照片超过 10 MB。请选择较小的图片。", "Размер фотографии превышает 10 МБ. Выберите изображение меньшего размера.", "Das Foto ist größer als 10 MB. Bitte wählen Sie ein kleineres Bild.", "La photo dépasse 10 Mo. Veuillez choisir une image plus petite.", "La foto supera los 10 MB. Elige una imagen más pequeña."],
    ["That photo format is not supported. Please choose a JPEG, PNG, WebP or HEIC image.", "ไม่รองรับรูปแบบไฟล์นี้ โปรดเลือกรูป JPEG, PNG, WebP หรือ HEIC", "不支持此照片格式。请选择 JPEG、PNG、WebP 或 HEIC 图片。", "Этот формат фотографии не поддерживается. Выберите JPEG, PNG, WebP или HEIC.", "Dieses Fotoformat wird nicht unterstützt. Bitte wählen Sie ein JPEG-, PNG-, WebP- oder HEIC-Bild.", "Ce format de photo n’est pas pris en charge. Choisissez une image JPEG, PNG, WebP ou HEIC.", "Este formato de foto no es compatible. Elige una imagen JPEG, PNG, WebP o HEIC."],
    ["The report could not be sent. Please try again or use Contact Us.", "ไม่สามารถส่งรายงานได้ โปรดลองอีกครั้งหรือใช้ปุ่มติดต่อเรา", "无法发送报告。请重试或使用“联系我们”。", "Не удалось отправить заявку. Повторите попытку или воспользуйтесь кнопкой «Связаться с нами».", "Die Meldung konnte nicht gesendet werden. Bitte versuchen Sie es erneut oder nutzen Sie „Kontakt aufnehmen“.", "Le signalement n’a pas pu être envoyé. Réessayez ou utilisez « Nous contacter ».", "No se pudo enviar el aviso. Inténtalo de nuevo o usa «Contáctanos»."],
    ["Your report has been recorded. Please use Contact Us if you need immediate assistance.", "บันทึกรายงานของคุณแล้ว หากต้องการความช่วยเหลือทันที โปรดใช้ปุ่มติดต่อเรา", "您的报告已记录。如需立即协助，请使用“联系我们”。", "Заявка зарегистрирована. Если помощь нужна немедленно, воспользуйтесь кнопкой «Связаться с нами».", "Ihre Meldung wurde erfasst. Wenn Sie sofort Hilfe benötigen, nutzen Sie bitte „Kontakt aufnehmen“.", "Votre signalement a été enregistré. Si vous avez besoin d’une aide immédiate, utilisez « Nous contacter ».", "Tu aviso ha quedado registrado. Si necesitas ayuda inmediata, usa «Contáctanos»."],
    ["Return to room guide", "กลับไปที่คู่มือห้องพัก", "返回客房指南", "Вернуться к руководству по номеру", "Zurück zum Zimmerleitfaden", "Retour au guide de la chambre", "Volver a la guía de la habitación"],
    ["Reference:", "หมายเลขอ้างอิง:", "参考编号：", "Номер заявки:", "Referenz:", "Référence :", "Referencia:"],
    ["JPEG, PNG, WebP or HEIC; maximum 10 MB. The photo stays private, is never sent through the AI chat and is automatically deleted within 30 days or sooner after the report is resolved.", "รองรับ JPEG, PNG, WebP หรือ HEIC ขนาดสูงสุด 10 MB รูปภาพจะถูกเก็บเป็นส่วนตัว ไม่ส่งผ่านแชต AI และจะถูกลบโดยอัตโนมัติภายใน 30 วัน หรือเร็วกว่านั้นหลังจากแก้ไขปัญหาแล้ว", "支持 JPEG、PNG、WebP 或 HEIC，最大 10 MB。照片将保持私密，不会通过 AI 聊天发送，并会在 30 天内或问题解决后更早自动删除。", "JPEG, PNG, WebP или HEIC; максимум 10 МБ. Фотография остаётся конфиденциальной, не передаётся через чат с ИИ и автоматически удаляется в течение 30 дней либо раньше после решения проблемы.", "JPEG, PNG, WebP oder HEIC; maximal 10 MB. Das Foto bleibt privat, wird nicht über den AI-Chat gesendet und innerhalb von 30 Tagen oder nach Erledigung der Meldung früher automatisch gelöscht.", "JPEG, PNG, WebP ou HEIC ; 10 Mo maximum. La photo reste privée, n’est jamais envoyée via le chat IA et est automatiquement supprimée sous 30 jours, ou plus tôt après la résolution du signalement.", "JPEG, PNG, WebP o HEIC; máximo 10 MB. La foto se mantiene privada, nunca se envía por el chat de IA y se elimina automáticamente en un plazo de 30 días o antes cuando se resuelve el aviso."],
    ["Report a Serious Room Problem", "แจ้งปัญหาร้ายแรงในห้อง", "报告严重客房问题", "Сообщить о серьёзной проблеме в номере", "Ernstes Zimmerproblem melden", "Signaler un problème grave dans la chambre", "Informar de un problema grave en la habitación"]
  ].forEach((entry) => add(...entry));

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
  add("Admin login", "เข้าสู่ระบบผู้ดูแล", "管理员登录", "Вход для администратора", "Admin-Anmeldung", "Connexion administrateur", "Acceso de administrador");
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
  add("Enter your stay code to unlock your private room guide.", "กรอกรหัสการเข้าพักเพื่อเปิดคู่มือห้องพักส่วนตัวของคุณ", "输入住宿代码即可解锁您的私人客房指南。", "Введите код проживания, чтобы открыть частный путеводитель по номеру.", "Geben Sie Ihren Aufenthaltscode ein, um Ihren privaten Zimmerführer zu öffnen.", "Saisissez votre code de séjour pour ouvrir le guide privé de votre chambre.", "Introduce tu código de estancia para abrir la guía privada de tu habitación.");
  add("Use the HM code in your Airbnb trip details, or your private House stay code.", "ใช้รหัส HM ในรายละเอียดการเดินทาง Airbnb หรือรหัสเข้าพักส่วนตัวของ The House", "请使用 Airbnb 行程详情中的 HM 代码，或您的 The House 私人住宿码。", "Используйте код HM из сведений о поездке Airbnb или частный код проживания The House.", "Verwenden Sie den HM-Code in Ihren Airbnb-Reisedetails oder Ihren privaten House-Aufenthaltscode.", "Utilisez le code HM indiqué dans les détails de votre voyage Airbnb ou votre code privé de séjour The House.", "Usa el código HM de los detalles de tu viaje de Airbnb o tu código privado de estancia de The House.");
  add("Your code is checked securely.", "ระบบตรวจสอบรหัสของคุณอย่างปลอดภัย", "您的代码会经过安全验证。", "Ваш код проверяется безопасно.", "Ihr Code wird sicher geprüft.", "Votre code est vérifié de manière sécurisée.", "Tu código se comprueba de forma segura.");
  add("Stay verified. Complete the short guest registration below.", "ยืนยันการเข้าพักแล้ว โปรดลงทะเบียนผู้เข้าพักแบบสั้นด้านล่าง", "住宿已验证。请完成下方的简短住客登记。", "Проживание подтверждено. Завершите короткую регистрацию гостей ниже.", "Aufenthalt verifiziert. Schließen Sie unten die kurze Gästeregistrierung ab.", "Séjour vérifié. Terminez le court enregistrement des voyageurs ci-dessous.", "Estancia verificada. Completa el breve registro de huéspedes a continuación.");
  add("Choose one option for everyone staying overnight. Mixed groups should choose Foreign guest(s).", "เลือกหนึ่งตัวเลือกสำหรับผู้เข้าพักค้างคืนทุกคน หากมีทั้งชาวไทยและชาวต่างชาติ ให้เลือก ผู้เข้าพักชาวต่างชาติ", "请为所有过夜住客选择一个选项。泰国籍与外籍混合的同行人员请选择“外籍住客”。", "Выберите один вариант для всех гостей, остающихся на ночь. Смешанной группе следует выбрать «Иностранные гости».", "Wählen Sie eine Option für alle Übernachtungsgäste. Gemischte Gruppen wählen „Nicht-thailändische Gäste“.", "Choisissez une option pour toutes les personnes passant la nuit. Les groupes mixtes doivent choisir « Clients étrangers ».", "Elige una opción para todas las personas que pasen la noche. Los grupos mixtos deben elegir «Huéspedes extranjeros».");
  add("No passport information is needed when every overnight guest is Thai.", "ไม่ต้องใช้ข้อมูลหนังสือเดินทางหากผู้เข้าพักค้างคืนทุกคนเป็นคนไทย", "如果所有过夜住客均为泰国公民，则无需提供护照信息。", "Если все гости, остающиеся на ночь, являются гражданами Таиланда, паспортные данные не требуются.", "Wenn alle Übernachtungsgäste thailändische Staatsangehörige sind, werden keine Passinformationen benötigt.", "Aucune information de passeport n’est nécessaire si toutes les personnes passant la nuit sont thaïlandaises.", "No se necesitan datos de pasaporte si todos los huéspedes que pasan la noche son tailandeses.");
  add("Passport information is required for every non-Thai adult and child staying overnight.", "ต้องใช้ข้อมูลหนังสือเดินทางของผู้ใหญ่และเด็กที่ไม่ใช่คนไทยทุกคนที่พักค้างคืน", "每位过夜的非泰国籍成人和儿童都必须提供护照信息。", "Паспортные данные требуются для каждого иностранного взрослого и ребёнка, остающегося на ночь.", "Passinformationen sind für jeden nicht-thailändischen Erwachsenen und jedes Kind erforderlich, die übernachten.", "Les informations de passeport sont requises pour chaque adulte et enfant non thaïlandais passant la nuit.", "Se requieren los datos del pasaporte de cada adulto y niño no tailandés que pase la noche.");
  add("Required for Thailand's TM30 registration. Passport images stay private and are deleted within 14 days—or sooner after processing.", "ข้อมูลนี้จำเป็นสำหรับการลงทะเบียน TM30 ของประเทศไทย รูปหนังสือเดินทางจะถูกเก็บเป็นส่วนตัวและลบภายใน 14 วัน หรือเร็วกว่านั้นหลังดำเนินการเสร็จ", "这些信息用于泰国 TM30 登记。护照图片将保持私密，并在 14 天内删除，或在处理完成后提前删除。", "Данные необходимы для регистрации TM30 в Таиланде. Изображения паспортов остаются конфиденциальными и удаляются в течение 14 дней или раньше после обработки.", "Die Angaben werden für die thailändische TM30-Meldung benötigt. Passbilder bleiben privat und werden innerhalb von 14 Tagen oder nach der Bearbeitung bereits früher gelöscht.", "Ces informations sont nécessaires à l’enregistrement TM30 en Thaïlande. Les images de passeport restent privées et sont supprimées sous 14 jours, ou plus tôt après traitement.", "Los datos son necesarios para el registro TM30 de Tailandia. Las imágenes de los pasaportes permanecen privadas y se eliminan en un plazo de 14 días o antes tras su procesamiento.");
  add("Choose a passport option", "เลือกวิธีส่งหนังสือเดินทาง", "选择护照提供方式", "Выберите способ предоставления паспортов", "Passoption wählen", "Choisissez une option pour les passeports", "Elige una opción para los pasaportes");
  add("One passport is required for each non-Thai adult and child staying overnight.", "ต้องใช้หนังสือเดินทางหนึ่งฉบับสำหรับผู้ใหญ่และเด็กที่ไม่ใช่คนไทยแต่ละคนที่พักค้างคืน", "每位过夜的非泰国籍成人和儿童均须提供一本护照。", "Для каждого иностранного взрослого и ребёнка, остающегося на ночь, требуется отдельный паспорт.", "Für jeden nicht-thailändischen Erwachsenen und jedes Kind, die übernachten, ist ein Pass erforderlich.", "Un passeport est requis pour chaque adulte et enfant non thaïlandais passant la nuit.", "Se requiere un pasaporte por cada adulto y niño no tailandés que pase la noche.");
  add("Use one private, single-use form per guest. Images are deleted within 14 days—or sooner.", "ใช้แบบฟอร์มส่วนตัวแบบใช้ครั้งเดียวหนึ่งชุดต่อผู้เข้าพักหนึ่งคน รูปจะถูกลบภายใน 14 วันหรือเร็วกว่านั้น", "每位住客使用一份私密的一次性表单。图片将在 14 天内删除，或更早删除。", "Для каждого гостя используется отдельная конфиденциальная одноразовая форма. Изображения удаляются в течение 14 дней или раньше.", "Verwenden Sie pro Gast ein privates Einmalformular. Bilder werden innerhalb von 14 Tagen oder früher gelöscht.", "Utilisez un formulaire privé à usage unique par personne. Les images sont supprimées sous 14 jours, ou plus tôt.", "Usa un formulario privado de un solo uso por huésped. Las imágenes se eliminan en un plazo de 14 días o antes.");
  add("Bring every required original passport to The House. No upload is needed.", "นำหนังสือเดินทางฉบับจริงที่จำเป็นทุกเล่มมาแสดงที่ The House โดยไม่ต้องอัปโหลด", "请将所有必需的护照原件带到 The House。无需上传。", "Принесите в The House все необходимые оригиналы паспортов. Загрузка не требуется.", "Bringen Sie alle erforderlichen Originalpässe zu The House. Ein Upload ist nicht nötig.", "Apportez à The House tous les passeports originaux requis. Aucun import n’est nécessaire.", "Lleva a The House todos los pasaportes originales requeridos. No es necesario subirlos.");
  add("Used only for TM30 registration. Your room guide opens after all passports are uploaded or checked in person.", "ใช้สำหรับการลงทะเบียน TM30 เท่านั้น คู่มือห้องพักจะเปิดเมื่ออัปโหลดหนังสือเดินทางครบแล้วหรือได้รับการตรวจด้วยตนเอง", "仅用于 TM30 登记。所有护照上传完毕或经当面核验后，您的客房指南将开放。", "Используется только для регистрации TM30. Путеводитель по номеру откроется после загрузки всех паспортов или их личной проверки.", "Nur für die TM30-Meldung. Ihr Zimmerführer wird geöffnet, nachdem alle Pässe hochgeladen oder persönlich geprüft wurden.", "Utilisé uniquement pour l’enregistrement TM30. Le guide de votre chambre s’ouvre lorsque tous les passeports ont été importés ou vérifiés en personne.", "Se usa solo para el registro TM30. La guía de tu habitación se abre cuando se han subido todos los pasaportes o se han comprobado en persona.");
  add("Choice saved. Bring every required original passport to The House. The guide opens after our team completes the check and TM30 registration.", "บันทึกตัวเลือกแล้ว โปรดนำหนังสือเดินทางฉบับจริงที่จำเป็นทุกเล่มมาแสดงที่ The House คู่มือจะเปิดหลังจากทีมงานตรวจสอบและลงทะเบียน TM30 เรียบร้อยแล้ว", "选择已保存。请将所有必需的护照原件带到 The House。团队完成核验和 TM30 登记后，指南将开放。", "Выбор сохранён. Принесите в The House все необходимые оригиналы паспортов. Путеводитель откроется после проверки нашей командой и завершения регистрации TM30.", "Auswahl gespeichert. Bringen Sie alle erforderlichen Originalpässe zu The House. Der Guide wird nach der Prüfung durch unser Team und der abgeschlossenen TM30-Meldung geöffnet.", "Choix enregistré. Apportez à The House tous les passeports originaux requis. Le guide s’ouvrira après leur contrôle par notre équipe et la fin de l’enregistrement TM30.", "Elección guardada. Lleva a The House todos los pasaportes originales requeridos. La guía se abrirá cuando nuestro equipo complete la comprobación y el registro TM30.");
  add("Emergency help remains available without verification.", "ยังสามารถเข้าถึงความช่วยเหลือฉุกเฉินได้โดยไม่ต้องยืนยันการเข้าพัก", "无需验证仍可获得紧急帮助。", "Экстренная помощь доступна без подтверждения проживания.", "Nothilfe bleibt ohne Verifizierung verfügbar.", "L’aide d’urgence reste accessible sans vérification.", "La ayuda de emergencia sigue disponible sin verificación.");
  add("Required guest registration", "การลงทะเบียนผู้เข้าพักที่จำเป็น", "必需的住客登记", "Обязательная регистрация гостя", "Erforderliche Gästeregistrierung", "Enregistrement client obligatoire", "Registro obligatorio de huéspedes");
  add("Upload passport securely", "อัปโหลดหนังสือเดินทางอย่างปลอดภัย", "安全上传护照", "Безопасно загрузить паспорт", "Pass sicher hochladen", "Importer le passeport en toute sécurité", "Subir el pasaporte de forma segura");
  add("Upload another non-Thai guest passport", "อัปโหลดหนังสือเดินทางของผู้เข้าพักต่างชาติอีกคน", "上传另一位非泰籍住客的护照", "Загрузить паспорт ещё одного иностранного гостя", "Pass eines weiteren nicht-thailändischen Gastes hochladen", "Importer le passeport d’un autre client non thaïlandais", "Subir el pasaporte de otro huésped no tailandés");
  add("All overnight guests are Thai nationals", "ผู้เข้าพักค้างคืนทุกคนเป็นบุคคลสัญชาติไทย", "所有过夜住客均为泰国公民", "Все гости, остающиеся на ночь, являются гражданами Таиланда", "Alle Übernachtungsgäste sind thailändische Staatsangehörige", "Tous les clients passant la nuit sont de nationalité thaïlandaise", "Todos los huéspedes que pasan la noche son ciudadanos tailandeses");
  add("This TM30 Immigration accommodation registration applies only to non-Thai guests. Thai nationals do not need to upload a passport. If any non-Thai guest is staying overnight, securely upload a passport for each one.", "การลงทะเบียนที่พักตามแบบ TM30 ของสำนักงานตรวจคนเข้าเมืองนี้ใช้กับผู้เข้าพักที่ไม่ใช่คนไทยเท่านั้น ผู้มีสัญชาติไทยไม่จำเป็นต้องอัปโหลดหนังสือเดินทาง หากมีผู้เข้าพักที่ไม่ใช่คนไทยค้างคืน โปรดอัปโหลดหนังสือเดินทางของแต่ละคนอย่างปลอดภัย", "此项 TM30 移民住宿登记仅适用于非泰国籍住客。泰国公民无需上传护照。如有任何非泰国籍住客过夜，请为每位住客安全上传护照。", "Регистрация проживания TM30 в иммиграционной службе требуется только для иностранных гостей. Гражданам Таиланда загружать паспорт не нужно. Если остаются иностранные гости, безопасно загрузите паспорт каждого из них.", "Diese TM30-Unterkunftsmeldung bei der Einwanderungsbehörde gilt nur für nicht-thailändische Gäste. Thailändische Staatsangehörige müssen keinen Pass hochladen. Wenn nicht-thailändische Gäste übernachten, laden Sie bitte für jede Person sicher einen Pass hoch.", "Cette déclaration d’hébergement TM30 auprès de l’immigration concerne uniquement les clients non thaïlandais. Les ressortissants thaïlandais n’ont pas à importer leur passeport. Si des clients non thaïlandais passent la nuit, importez de manière sécurisée le passeport de chacun.", "Este registro de alojamiento TM30 ante Inmigración solo se aplica a huéspedes no tailandeses. Los ciudadanos tailandeses no necesitan subir el pasaporte. Si se aloja algún huésped no tailandés, sube de forma segura el pasaporte de cada uno.");
  add("Choose the Thai-national exemption only when every overnight guest on this reservation is Thai. Passport images use a private, room-bound, single-use upload form and are automatically deleted 14 days after upload, or sooner after processing. Never send passport information in the concierge chat or WhatsApp.", "เลือกข้อยกเว้นสำหรับผู้มีสัญชาติไทยเฉพาะเมื่อผู้เข้าพักค้างคืนทุกคนในการจองนี้มีสัญชาติไทย รูปหนังสือเดินทางจะอัปโหลดผ่านแบบฟอร์มส่วนตัวที่ผูกกับห้องและใช้ได้ครั้งเดียว และจะถูกลบโดยอัตโนมัติ 14 วันหลังอัปโหลด หรือเร็วกว่านั้นหลังดำเนินการเสร็จ โปรดอย่าส่งข้อมูลหนังสือเดินทางในแชตคอนเซียร์จหรือ WhatsApp", "仅当此预订的所有过夜住客均为泰国公民时，才选择泰国公民豁免。护照图片通过与房间绑定的私密一次性表单上传，并会在上传 14 天后自动删除；处理完成后也可能提前删除。切勿在礼宾聊天或 WhatsApp 中发送护照信息。", "Выбирайте освобождение для граждан Таиланда только в том случае, если все гости, остающиеся на ночь по этому бронированию, являются гражданами Таиланда. Изображения паспортов загружаются через конфиденциальную одноразовую форму, привязанную к номеру, и автоматически удаляются через 14 дней после загрузки или раньше после обработки. Никогда не отправляйте паспортные данные в чате консьержа или WhatsApp.", "Wählen Sie die Ausnahme für thailändische Staatsangehörige nur, wenn alle Übernachtungsgäste dieser Buchung thailändische Staatsangehörige sind. Passbilder werden über ein privates, zimmergebundenes und nur einmal nutzbares Formular hochgeladen und 14 Tage nach dem Upload oder nach der Bearbeitung bereits früher automatisch gelöscht. Senden Sie Passdaten niemals im Concierge-Chat oder über WhatsApp.", "Choisissez l’exemption pour ressortissants thaïlandais uniquement si tous les clients passant la nuit dans le cadre de cette réservation sont de nationalité thaïlandaise. Les images de passeport sont importées au moyen d’un formulaire privé, lié à la chambre et à usage unique, puis supprimées automatiquement 14 jours après l’importation, ou plus tôt après traitement. N’envoyez jamais de données de passeport dans le chat de la conciergerie ni sur WhatsApp.", "Selecciona la exención para ciudadanos tailandeses solo si todos los huéspedes que pasan la noche en esta reserva son ciudadanos tailandeses. Las imágenes de pasaporte se suben mediante un formulario privado, vinculado a la habitación y de un solo uso, y se eliminan automáticamente 14 días después de la carga o antes tras su procesamiento. Nunca envíes datos del pasaporte por el chat de conserjería ni por WhatsApp.");
  add("Who is staying overnight?", "ใครบ้างที่จะเข้าพักค้างคืน", "哪些人会过夜？", "Кто будет оставаться на ночь?", "Wer übernachtet im Zimmer?", "Qui passera la nuit dans la chambre ?", "¿Quién se alojará durante la noche?");
  add("Choose the option that applies to everyone staying in the room. If the group includes both Thai and foreign guests, choose Foreign guest(s).", "เลือกตัวเลือกที่ตรงกับผู้เข้าพักทุกคนในห้อง หากมีทั้งผู้เข้าพักชาวไทยและชาวต่างชาติ ให้เลือก ผู้เข้าพักชาวต่างชาติ", "请选择适用于房间内所有住客的选项。如果同行者中既有泰国籍住客也有外籍住客，请选择“外籍住客”。", "Выберите вариант, который относится ко всем проживающим в номере. Если в группе есть и граждане Таиланда, и иностранцы, выберите «Иностранные гости».", "Wählen Sie die Option, die für alle Personen im Zimmer gilt. Wenn sowohl thailändische als auch ausländische Gäste zur Gruppe gehören, wählen Sie „Nicht-thailändische Gäste“.", "Choisissez l’option correspondant à toutes les personnes séjournant dans la chambre. Si le groupe comprend des clients thaïlandais et étrangers, choisissez « Clients étrangers ».", "Elige la opción aplicable a todas las personas que se alojarán en la habitación. Si el grupo incluye huéspedes tailandeses y extranjeros, elige «Huéspedes extranjeros».");
  add("Thai nationals only", "เฉพาะผู้มีสัญชาติไทยเท่านั้น", "仅限泰国公民", "Только граждане Таиланда", "Nur thailändische Staatsangehörige", "Ressortissants thaïlandais uniquement", "Solo ciudadanos tailandeses");
  add("All overnight guests are Thai", "ผู้เข้าพักค้างคืนทุกคนเป็นคนไทย", "所有过夜住客均为泰国公民", "Все гости, остающиеся на ночь, являются гражданами Таиланда", "Alle Übernachtungsgäste sind thailändische Staatsangehörige", "Tous les clients passant la nuit sont de nationalité thaïlandaise", "Todos los huéspedes que pasan la noche son ciudadanos tailandeses");
  add("Foreign guest(s)", "ผู้เข้าพักชาวต่างชาติ", "外籍住客", "Иностранные гости", "Nicht-thailändische Gäste", "Clients étrangers", "Huéspedes extranjeros");
  add("Passport information is required for every non-Thai person staying overnight, not only the guest who made the booking.", "ต้องส่งข้อมูลหนังสือเดินทางของผู้เข้าพักค้างคืนที่ไม่ใช่คนไทยทุกคน ไม่ใช่เฉพาะผู้ที่ทำการจอง", "每位过夜的非泰国籍住客都必须提交护照信息，而不只是预订人。", "Паспортные данные требуются для каждого иностранного гостя, остающегося на ночь, а не только для гостя, оформившего бронирование.", "Passinformationen sind für jede nicht-thailändische Person erforderlich, die übernachtet – nicht nur für den Buchungsgast.", "Les informations de passeport sont requises pour chaque personne non thaïlandaise passant la nuit, et pas seulement pour la personne ayant effectué la réservation.", "Se requieren los datos del pasaporte de cada persona no tailandesa que se aloje durante la noche, no solo de quien hizo la reserva.");
  add("Number of non-Thai overnight guests", "จำนวนผู้เข้าพักค้างคืนที่ไม่ใช่คนไทย", "过夜的非泰国籍住客人数", "Количество иностранных гостей, остающихся на ночь", "Anzahl der nicht-thailändischen Übernachtungsgäste", "Nombre de clients non thaïlandais passant la nuit", "Número de huéspedes no tailandeses que pasarán la noche");
  add("I confirm this number includes every non-Thai adult and child staying overnight, not only the Airbnb booking guest.", "ฉันยืนยันว่าจำนวนนี้รวมผู้ใหญ่และเด็กที่ไม่ใช่คนไทยทุกคนที่พักค้างคืน ไม่ใช่เฉพาะผู้จองผ่าน Airbnb", "我确认此人数包括所有过夜的非泰国籍成人和儿童，而不只是 Airbnb 预订人。", "Я подтверждаю, что это число включает всех иностранных взрослых и детей, остающихся на ночь, а не только гостя, оформившего бронирование на Airbnb.", "Ich bestätige, dass diese Anzahl alle nicht-thailändischen Erwachsenen und Kinder umfasst, die übernachten – nicht nur den Airbnb-Buchungsgast.", "Je confirme que ce nombre comprend tous les adultes et enfants non thaïlandais passant la nuit, et pas seulement la personne ayant réservé sur Airbnb.", "Confirmo que este número incluye a todos los adultos y niños no tailandeses que pasarán la noche, no solo a quien hizo la reserva en Airbnb.");
  add("Continue to secure passport upload", "ดำเนินการต่อเพื่ออัปโหลดหนังสือเดินทางอย่างปลอดภัย", "继续安全上传护照", "Перейти к безопасной загрузке паспортов", "Weiter zum sicheren Pass-Upload", "Continuer vers l’importation sécurisée des passeports", "Continuar a la subida segura de pasaportes");
  add("Continue to passport options", "ไปยังตัวเลือกการส่งหนังสือเดินทาง", "继续选择护照提供方式", "Перейти к способам предоставления паспортов", "Weiter zu den Passoptionen", "Continuer vers les options de passeport", "Continuar a las opciones de pasaporte");
  add("Complete passport information", "ส่งข้อมูลหนังสือเดินทางให้ครบถ้วน", "完成护照信息提交", "Завершите предоставление паспортных данных", "Passinformationen vollständig einreichen", "Complétez les informations de passeport", "Completa los datos de los pasaportes");
  add("Choose how to provide passport information", "เลือกวิธีส่งข้อมูลหนังสือเดินทาง", "选择护照信息的提供方式", "Выберите способ предоставления паспортных данных", "Art der Passübermittlung wählen", "Choisissez comment fournir les informations de passeport", "Elige cómo facilitar los datos del pasaporte");
  add("Choose how you would like to provide the required passport information.", "เลือกวิธีที่คุณต้องการใช้ส่งข้อมูลหนังสือเดินทางที่จำเป็น", "请选择您希望如何提供所需的护照信息。", "Выберите, как вы хотите предоставить необходимые паспортные данные.", "Wählen Sie, wie Sie die erforderlichen Passinformationen bereitstellen möchten.", "Choisissez comment vous souhaitez fournir les informations de passeport requises.", "Elige cómo deseas facilitar los datos de pasaporte requeridos.");
  add("Upload passports securely", "อัปโหลดหนังสือเดินทางอย่างปลอดภัย", "安全上传护照", "Безопасно загрузить паспорта", "Pässe sicher hochladen", "Importer les passeports en toute sécurité", "Subir los pasaportes de forma segura");
  add("Use one private, room-bound and single-use form for each non-Thai overnight guest. Passport images are automatically deleted 14 days after upload—or sooner after processing.", "ใช้แบบฟอร์มส่วนตัวที่ผูกกับห้องและใช้ได้ครั้งเดียวหนึ่งแบบฟอร์มต่อผู้เข้าพักค้างคืนที่ไม่ใช่คนไทยแต่ละคน รูปหนังสือเดินทางจะถูกลบโดยอัตโนมัติ 14 วันหลังอัปโหลด หรือเร็วกว่านั้นหลังดำเนินการเสร็จ", "每位过夜的非泰国籍住客均须使用一份与房间绑定的私密一次性表单。护照图片会在上传 14 天后自动删除，或在处理完成后提前删除。", "Для каждого иностранного гостя, остающегося на ночь, используется отдельная конфиденциальная одноразовая форма, привязанная к номеру. Изображения паспортов автоматически удаляются через 14 дней после загрузки или раньше после обработки.", "Für jeden nicht-thailändischen Übernachtungsgast wird ein eigenes privates, zimmergebundenes und einmalig nutzbares Formular verwendet. Passbilder werden 14 Tage nach dem Upload oder nach der Bearbeitung bereits früher automatisch gelöscht.", "Utilisez un formulaire privé, lié à la chambre et à usage unique pour chaque client non thaïlandais passant la nuit. Les images de passeport sont supprimées automatiquement 14 jours après l’importation, ou plus tôt après traitement.", "Usa un formulario privado, vinculado a la habitación y de un solo uso para cada huésped no tailandés que pase la noche. Las imágenes de los pasaportes se eliminan automáticamente 14 días después de subirlas o antes tras su procesamiento.");
  add("Provide passports in person", "นำหนังสือเดินทางมาแสดงด้วยตนเอง", "亲自出示护照", "Предоставить паспорта лично", "Pässe persönlich vorlegen", "Présenter les passeports en personne", "Presentar los pasaportes en persona");
  add("Bring the original passports of every non-Thai adult and child staying overnight to The House. No passport image upload is needed when you choose this option.", "นำหนังสือเดินทางฉบับจริงของผู้ใหญ่และเด็กที่ไม่ใช่คนไทยทุกคนที่พักค้างคืนมาแสดงที่ The House หากเลือกตัวเลือกนี้ ไม่จำเป็นต้องอัปโหลดรูปหนังสือเดินทาง", "请将每位过夜的非泰国籍成人和儿童的护照原件带到 The House。选择此选项后无需上传护照图片。", "Принесите в The House оригиналы паспортов всех иностранных взрослых и детей, остающихся на ночь. При выборе этого варианта загружать изображения паспортов не нужно.", "Bringen Sie die Originalpässe aller nicht-thailändischen Erwachsenen und Kinder, die übernachten, persönlich zu The House. Bei dieser Option müssen keine Passbilder hochgeladen werden.", "Apportez à The House les passeports originaux de chaque adulte et enfant non thaïlandais passant la nuit. Si vous choisissez cette option, aucune image de passeport ne doit être importée.", "Lleva a The House los pasaportes originales de todos los adultos y niños no tailandeses que pasen la noche. Si eliges esta opción, no necesitas subir imágenes de los pasaportes.");
  add("I will provide all passports in person", "ฉันจะนำหนังสือเดินทางทั้งหมดมาแสดงด้วยตนเอง", "我会亲自出示所有护照", "Я предоставлю все паспорта лично", "Ich werde alle Pässe persönlich vorlegen", "Je présenterai tous les passeports en personne", "Presentaré todos los pasaportes en persona");
  add("The required details are used only for Thailand's TM30 accommodation registration. The private room guide opens after all secure uploads are received, or after our team confirms the in-person passport check and registration are complete.", "ข้อมูลที่จำเป็นจะใช้สำหรับการลงทะเบียนที่พัก TM30 ของประเทศไทยเท่านั้น คู่มือห้องส่วนตัวจะเปิดหลังจากได้รับการอัปโหลดที่ปลอดภัยครบทุกคน หรือหลังจากทีมงานยืนยันว่าตรวจหนังสือเดินทางด้วยตนเองและลงทะเบียนเรียบร้อยแล้ว", "所需信息仅用于泰国 TM30 住宿登记。所有护照均安全上传完毕，或团队确认已当面核验所有护照并完成登记后，私人客房指南才会开放。", "Необходимые данные используются только для тайской регистрации проживания TM30. Доступ к частному путеводителю по номеру откроется после получения всех безопасных загрузок либо после подтверждения командой личной проверки паспортов и завершения регистрации.", "Die erforderlichen Angaben werden ausschließlich für die thailändische TM30-Unterkunftsmeldung verwendet. Der private Zimmerführer wird geöffnet, sobald alle sicheren Uploads eingegangen sind oder unser Team die persönliche Passprüfung und die abgeschlossene Registrierung bestätigt hat.", "Les informations requises sont utilisées uniquement pour la déclaration d’hébergement TM30 en Thaïlande. Le guide privé de la chambre s’ouvre lorsque tous les imports sécurisés ont été reçus, ou après confirmation par notre équipe du contrôle des passeports en personne et de la fin de l’enregistrement.", "Los datos requeridos se utilizan únicamente para el registro de alojamiento TM30 de Tailandia. La guía privada de la habitación se abre cuando se han recibido todas las cargas seguras o cuando nuestro equipo confirma que ha comprobado los pasaportes en persona y completado el registro.");
  add("Passports will be provided in person", "จะนำหนังสือเดินทางมาแสดงด้วยตนเอง", "护照将由住客亲自出示", "Паспорта будут предоставлены лично", "Pässe werden persönlich vorgelegt", "Les passeports seront présentés en personne", "Los pasaportes se presentarán en persona");
  add("Recording your choice to provide passports in person…", "กำลังบันทึกว่าคุณจะนำหนังสือเดินทางมาแสดงด้วยตนเอง…", "正在记录您将亲自出示护照的选择…", "Сохраняем выбор предоставить паспорта лично…", "Die persönliche Passvorlage wird gespeichert…", "Enregistrement de votre choix de présenter les passeports en personne…", "Guardando tu elección de presentar los pasaportes en persona…");
  add("Your in-person passport handover is noted. Please bring the original passports of every non-Thai adult and child staying overnight. The private room guide will open after our team has checked them and completed the TM30 registration.", "บันทึกแล้วว่าคุณจะนำหนังสือเดินทางมาแสดงด้วยตนเอง โปรดนำหนังสือเดินทางฉบับจริงของผู้ใหญ่และเด็กที่ไม่ใช่คนไทยทุกคนที่พักค้างคืนมาแสดง คู่มือห้องส่วนตัวจะเปิดหลังจากทีมงานตรวจสอบและดำเนินการลงทะเบียน TM30 เรียบร้อยแล้ว", "已记录您将亲自出示护照。请携带每位过夜的非泰国籍成人和儿童的护照原件。团队完成核验和 TM30 登记后，私人客房指南将开放。", "Ваш выбор предоставить паспорта лично сохранён. Принесите оригиналы паспортов всех иностранных взрослых и детей, остающихся на ночь. Частный путеводитель по номеру откроется после проверки документов нашей командой и завершения регистрации TM30.", "Ihre persönliche Passvorlage wurde vermerkt. Bitte bringen Sie die Originalpässe aller nicht-thailändischen Erwachsenen und Kinder mit, die übernachten. Der private Zimmerführer wird geöffnet, nachdem unser Team die Pässe geprüft und die TM30-Meldung abgeschlossen hat.", "Votre choix de présenter les passeports en personne a été enregistré. Apportez les passeports originaux de chaque adulte et enfant non thaïlandais passant la nuit. Le guide privé de la chambre s’ouvrira lorsque notre équipe les aura contrôlés et aura terminé l’enregistrement TM30.", "Hemos anotado que presentarás los pasaportes en persona. Lleva los pasaportes originales de todos los adultos y niños no tailandeses que pasen la noche. La guía privada de la habitación se abrirá cuando nuestro equipo los haya comprobado y haya completado el registro TM30.");
  add("The in-person passport option could not be saved. Please try again.", "ไม่สามารถบันทึกตัวเลือกการแสดงหนังสือเดินทางด้วยตนเองได้ โปรดลองอีกครั้ง", "无法保存亲自出示护照的选项。请重试。", "Не удалось сохранить вариант личного предоставления паспортов. Повторите попытку.", "Die persönliche Passvorlage konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.", "L’option de présentation des passeports en personne n’a pas pu être enregistrée. Veuillez réessayer.", "No se pudo guardar la opción de presentar los pasaportes en persona. Inténtalo de nuevo.");
  add("Every non-Thai overnight guest must be submitted.", "ต้องส่งข้อมูลของผู้เข้าพักค้างคืนที่ไม่ใช่คนไทยทุกคน", "必须提交每位过夜的非泰国籍住客的信息。", "Необходимо предоставить данные каждого иностранного гостя, остающегося на ночь.", "Für jeden nicht-thailändischen Übernachtungsgast müssen die Angaben eingereicht werden.", "Les informations de chaque client non thaïlandais passant la nuit doivent être transmises.", "Deben enviarse los datos de cada huésped no tailandés que pase la noche.");
  add("This includes partners, family members, friends and children staying in the room, not only the Airbnb booking guest.", "รวมถึงคู่รัก สมาชิกครอบครัว เพื่อน และเด็กที่พักในห้อง ไม่ใช่เฉพาะผู้จองผ่าน Airbnb", "这包括住在房间内的伴侣、家人、朋友和儿童，而不只是 Airbnb 预订人。", "Это относится к партнёрам, членам семьи, друзьям и детям, проживающим в номере, а не только к гостю, оформившему бронирование на Airbnb.", "Dies gilt für Partner, Familienmitglieder, Freunde und Kinder im Zimmer – nicht nur für den Airbnb-Buchungsgast.", "Cela inclut les partenaires, les membres de la famille, les amis et les enfants séjournant dans la chambre, et pas seulement la personne ayant réservé sur Airbnb.", "Esto incluye parejas, familiares, amigos y niños que se alojen en la habitación, no solo a quien hizo la reserva en Airbnb.");
  add("Upload next passport securely", "อัปโหลดหนังสือเดินทางฉบับถัดไปอย่างปลอดภัย", "安全上传下一本护照", "Безопасно загрузить следующий паспорт", "Nächsten Pass sicher hochladen", "Importer le passeport suivant en toute sécurité", "Subir de forma segura el siguiente pasaporte");
  add("Protected after-hours access", "การเข้าถึงที่ได้รับการป้องกันนอกเวลาทำการ", "受保护的非服务时段访问", "Защищённый доступ в нерабочее время", "Geschützter Zugang außerhalb der Servicezeiten", "Accès protégé hors horaires", "Acceso protegido fuera de horario");
  add("Lost key or locked out?", "กุญแจหายหรือเข้าห้องไม่ได้ใช่ไหม", "钥匙丢失或被锁在门外？", "Потеряли ключ или не можете войти?", "Schlüssel verloren oder ausgesperrt?", "Clé perdue ou porte verrouillée ?", "¿Has perdido la llave o no puedes entrar?");
  add("Secure after-hours help if you cannot enter your room.", "ความช่วยเหลือนอกเวลาทำการอย่างปลอดภัย หากคุณไม่สามารถเข้าห้องได้", "如果您无法进入客房，可安全获取非工作时段协助。", "Безопасная помощь в нерабочее время, если вы не можете попасть в номер.", "Sichere Hilfe außerhalb der Servicezeiten, wenn Sie nicht in Ihr Zimmer kommen.", "Assistance sécurisée en dehors des heures de service si vous ne pouvez pas entrer dans votre chambre.", "Ayuda segura fuera del horario de atención si no puedes entrar en tu habitación.");
  add("Back to room guide", "กลับไปยังคู่มือห้องพัก", "返回客房指南", "Вернуться к путеводителю по номеру", "Zurück zum Zimmerführer", "Retour au guide de la chambre", "Volver a la guía de la habitación");
  add("Re-enter your Airbnb confirmation code before the key-box code can be released. This fresh check is used only for this lost-key request.", "กรอกรหัสยืนยัน Airbnb ของคุณอีกครั้งก่อนแสดงรหัสกล่องกุญแจ การตรวจสอบใหม่นี้ใช้เฉพาะคำขอกุญแจหายครั้งนี้เท่านั้น", "在提供钥匙盒密码前，请重新输入您的 Airbnb 确认码。此次重新验证仅用于本次钥匙遗失请求。", "Перед выдачей кода сейфа для ключа повторно введите код подтверждения Airbnb. Эта повторная проверка используется только для данного запроса об утерянном ключе.", "Geben Sie Ihren Airbnb-Bestätigungscode erneut ein, bevor der Schlüsselkasten-Code freigegeben werden kann. Diese erneute Prüfung gilt nur für diese Anfrage wegen eines verlorenen Schlüssels.", "Saisissez à nouveau votre code de confirmation Airbnb avant que le code de la boîte à clés puisse être communiqué. Cette nouvelle vérification sert uniquement à cette demande de clé perdue.", "Vuelve a introducir tu código de confirmación de Airbnb antes de que se muestre el código de la caja de llaves. Esta nueva comprobación se usa únicamente para esta solicitud por pérdida de llave.");
  add("Airbnb confirmation code for this lost-key request", "รหัสยืนยัน Airbnb สำหรับคำขอกุญแจหายครั้งนี้", "本次钥匙遗失请求的 Airbnb 确认码", "Код подтверждения Airbnb для этого запроса об утерянном ключе", "Airbnb-Bestätigungscode für diese Anfrage wegen eines verlorenen Schlüssels", "Code de confirmation Airbnb pour cette demande de clé perdue", "Código de confirmación de Airbnb para esta solicitud por pérdida de llave");
  add("Re-enter the HM code shown in your Airbnb trip details.", "กรอกรหัส HM ที่แสดงในรายละเอียดการเดินทาง Airbnb ของคุณอีกครั้ง", "请重新输入 Airbnb 行程详情中显示的 HM 代码。", "Повторно введите код HM из сведений о поездке Airbnb.", "Geben Sie den HM-Code aus Ihren Airbnb-Reisedetails erneut ein.", "Saisissez à nouveau le code HM affiché dans les détails de votre voyage Airbnb.", "Vuelve a introducir el código HM que aparece en los detalles de tu viaje de Airbnb.");
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
  add("Continue only if you have lost your key or are locked out.", "ดำเนินการต่อเฉพาะเมื่อคุณทำกุญแจหายหรือเข้าห้องไม่ได้เท่านั้น", "仅当您丢失钥匙或被锁在门外时才继续。", "Продолжайте, только если вы потеряли ключ или не можете попасть в номер.", "Fahren Sie nur fort, wenn Sie Ihren Schlüssel verloren haben oder ausgesperrt sind.", "Continuez uniquement si vous avez perdu votre clé ou si vous êtes enfermé à l’extérieur.", "Continúa solo si has perdido la llave o no puedes entrar en la habitación.");
  add("I accept the 500 THB lost-key replacement fee.", "ฉันยอมรับค่าทดแทนกุญแจหาย 500 THB", "我接受 500 THB 的钥匙遗失更换费。", "Я принимаю сбор 500 THB за замену утерянного ключа.", "Ich akzeptiere die Ersatzgebühr von 500 THB für den verlorenen Schlüssel.", "J’accepte les frais de remplacement de 500 THB pour la clé perdue.", "Acepto la tarifa de sustitución de 500 THB por pérdida de llave.");
  add("Accept fee & continue", "ยอมรับค่าธรรมเนียมและดำเนินการต่อ", "接受费用并继续", "Принять сбор и продолжить", "Gebühr akzeptieren und fortfahren", "Accepter les frais et continuer", "Aceptar la tarifa y continuar");
  add("Re-enter the Airbnb confirmation code for your verified active stay before continuing.", "กรอกรหัสยืนยัน Airbnb สำหรับการเข้าพักที่กำลังดำเนินอยู่และได้รับการยืนยันอีกครั้งก่อนดำเนินการต่อ", "继续前，请重新输入您已验证且当前有效住宿的 Airbnb 确认码。", "Перед продолжением повторно введите код подтверждения Airbnb для подтверждённого текущего проживания.", "Geben Sie vor dem Fortfahren den Airbnb-Bestätigungscode Ihres verifizierten aktiven Aufenthalts erneut ein.", "Avant de continuer, saisissez à nouveau le code de confirmation Airbnb de votre séjour actif vérifié.", "Antes de continuar, vuelve a introducir el código de confirmación de Airbnb de tu estancia activa verificada.");
  add("That confirmation code does not match your verified active stay. Check the HM code shown in your Airbnb trip details and try again.", "รหัสยืนยันนั้นไม่ตรงกับการเข้าพักที่กำลังดำเนินอยู่และได้รับการยืนยันของคุณ ตรวจสอบรหัส HM ในรายละเอียดการเดินทาง Airbnb แล้วลองอีกครั้ง", "该确认码与您已验证且当前有效的住宿不匹配。请检查 Airbnb 行程详情中显示的 HM 代码，然后重试。", "Этот код подтверждения не соответствует вашему подтверждённому текущему проживанию. Проверьте код HM в сведениях о поездке Airbnb и повторите попытку.", "Dieser Bestätigungscode stimmt nicht mit Ihrem verifizierten aktiven Aufenthalt überein. Prüfen Sie den HM-Code in Ihren Airbnb-Reisedetails und versuchen Sie es erneut.", "Ce code de confirmation ne correspond pas à votre séjour actif vérifié. Vérifiez le code HM affiché dans les détails de votre voyage Airbnb et réessayez.", "Ese código de confirmación no coincide con tu estancia activa verificada. Comprueba el código HM que aparece en los detalles de tu viaje de Airbnb e inténtalo de nuevo.");
  add("Too many confirmation attempts. Please wait a minute before trying again.", "มีการลองยืนยันหลายครั้งเกินไป โปรดรอหนึ่งนาทีก่อนลองอีกครั้ง", "确认尝试次数过多。请等待一分钟后重试。", "Слишком много попыток подтверждения. Подождите минуту и повторите попытку.", "Zu viele Bestätigungsversuche. Bitte warten Sie eine Minute und versuchen Sie es erneut.", "Trop de tentatives de confirmation. Veuillez patienter une minute avant de réessayer.", "Demasiados intentos de confirmación. Espera un minuto antes de volver a intentarlo.");
  add("Verifying the after-hours request and notifying the team…", "กำลังตรวจสอบคำขอนอกเวลาทำการและแจ้งทีม…", "正在验证非服务时段请求并通知团队…", "Проверяем запрос и уведомляем команду…", "Anfrage wird geprüft und das Team benachrichtigt…", "Vérification de la demande et notification de l’équipe…", "Verificando la solicitud y avisando al equipo…");
  add("Spare key access approved for Room {room}.", "อนุมัติการเข้าถึงกุญแจสำรองสำหรับห้อง {room} แล้ว", "已批准房间 {room} 的备用钥匙访问。", "Доступ к запасному ключу для номера {room} разрешён.", "Ersatzschlüssel-Zugang für Zimmer {room} genehmigt.", "Accès à la clé de secours approuvé pour la chambre {room}.", "Acceso a la llave de repuesto aprobado para la habitación {room}.");

  // Frequently used room, registration and emergency labels.
  add("Check-in", "เช็กอิน", "入住", "Заезд", "Check-in", "Arrivée", "Entrada");
  add("Luggage storage", "บริการรับฝากสัมภาระ", "行李寄存", "Хранение багажа", "Gepäckaufbewahrung", "Consigne à bagages", "Guardaequipaje");
  add("Tuesday–Sunday during office working hours, or at Bamboo Beach Bar from 11:00 AM. No storage is currently available before 11:00 AM.", "วันอังคาร–วันอาทิตย์ในเวลาทำการของสำนักงาน หรือฝากได้ที่ Bamboo Beach Bar ตั้งแต่ 11:00 น. ขณะนี้ยังไม่มีบริการรับฝากสัมภาระก่อน 11:00 น.", "周二至周日可在办公室工作时间寄存，或从上午 11:00 起寄存在 Bamboo Beach Bar。目前上午 11:00 前暂不提供行李寄存。", "Со вторника по воскресенье — в рабочие часы офиса, либо в Bamboo Beach Bar с 11:00. В настоящее время до 11:00 хранение багажа недоступно.", "Dienstag bis Sonntag während der Bürozeiten oder ab 11:00 Uhr in der Bamboo Beach Bar. Vor 11:00 Uhr ist derzeit keine Gepäckaufbewahrung verfügbar.", "Du mardi au dimanche pendant les heures d’ouverture du bureau, ou au Bamboo Beach Bar à partir de 11 h. Aucun dépôt de bagages n’est actuellement disponible avant 11 h.", "De martes a domingo durante el horario de la oficina, o en Bamboo Beach Bar a partir de las 11:00. Actualmente no hay guardaequipaje disponible antes de las 11:00.");
  add("Luggage storage is available Tuesday–Sunday during office working hours. If the office is unavailable, luggage can be stored at Bamboo Beach Bar from 11:00 AM. We do not currently have luggage storage for early-morning arrivals before 11:00 AM.", "มีบริการรับฝากสัมภาระวันอังคาร–วันอาทิตย์ในเวลาทำการของสำนักงาน หากสำนักงานไม่เปิดให้บริการ สามารถฝากสัมภาระได้ที่ Bamboo Beach Bar ตั้งแต่ 11:00 น. ขณะนี้เรายังไม่มีบริการรับฝากสัมภาระสำหรับผู้ที่มาถึงช่วงเช้าตรู่ก่อน 11:00 น.", "周二至周日可在办公室工作时间寄存行李。如果办公室无法提供服务，可从上午 11:00 起将行李寄存在 Bamboo Beach Bar。目前对于上午 11:00 前抵达的早班客人，我们暂不提供行李寄存。", "Камера хранения доступна со вторника по воскресенье в рабочие часы офиса. Если офис недоступен, багаж можно оставить в Bamboo Beach Bar с 11:00. В настоящее время мы не можем хранить багаж гостей, прибывающих рано утром до 11:00.", "Eine Gepäckaufbewahrung ist von Dienstag bis Sonntag während der Bürozeiten verfügbar. Wenn das Büro nicht erreichbar ist, kann Gepäck ab 11:00 Uhr in der Bamboo Beach Bar aufbewahrt werden. Für frühmorgendliche Ankünfte vor 11:00 Uhr können wir derzeit keine Gepäckaufbewahrung anbieten.", "Une consigne à bagages est disponible du mardi au dimanche pendant les heures d’ouverture du bureau. Si le bureau n’est pas disponible, les bagages peuvent être déposés au Bamboo Beach Bar à partir de 11 h. Nous ne proposons actuellement aucune consigne pour les arrivées tôt le matin avant 11 h.", "El guardaequipaje está disponible de martes a domingo durante el horario de la oficina. Si la oficina no está disponible, el equipaje puede dejarse en Bamboo Beach Bar a partir de las 11:00. Actualmente no ofrecemos guardaequipaje para llegadas temprano por la mañana antes de las 11:00.");
  add("💧 Please conserve water and electricity", "💧 โปรดช่วยประหยัดน้ำและไฟฟ้า", "💧 请节约用水和用电", "💧 Берегите воду и электроэнергию", "💧 Bitte Wasser und Strom sparen", "💧 Merci d’économiser l’eau et l’électricité", "💧 Ayúdanos a ahorrar agua y electricidad");
  add("Fresh water is limited on Koh Tao. Electricity reaches the island through an undersea grid connection developed to reduce reliance on local diesel generators. Please use water and power thoughtfully, and switch off the air conditioning and lights whenever you leave the room.", "น้ำจืดบนเกาะเต่ามีจำกัด ไฟฟ้าส่งมายังเกาะผ่านการเชื่อมต่อโครงข่ายด้วยสายเคเบิลใต้น้ำ ซึ่งพัฒนาขึ้นเพื่อลดการพึ่งพาเครื่องกำเนิดไฟฟ้าดีเซลในพื้นที่ โปรดใช้น้ำและไฟฟ้าอย่างรู้คุณค่า และปิดเครื่องปรับอากาศกับไฟทุกครั้งเมื่อออกจากห้อง", "涛岛的淡水资源有限。电力通过海底电缆连接输送到岛上，该连接旨在减少对本地柴油发电机的依赖。请节约用水和用电，并在离开房间时关闭空调和灯。", "Запасы пресной воды на Ко Тао ограничены. Электричество поступает на остров по подводному соединению с энергосетью, созданному для снижения зависимости от местных дизельных генераторов. Пожалуйста, бережно расходуйте воду и электроэнергию и выключайте кондиционер и свет, когда выходите из номера.", "Frischwasser ist auf Koh Tao begrenzt. Der Strom erreicht die Insel über eine Unterseekabelverbindung, die entwickelt wurde, um die Abhängigkeit von lokalen Dieselgeneratoren zu verringern. Bitte gehen Sie bewusst mit Wasser und Strom um und schalten Sie Klimaanlage und Licht aus, wenn Sie das Zimmer verlassen.", "L’eau douce est limitée à Koh Tao. L’électricité arrive sur l’île par une connexion au réseau via un câble sous-marin, conçue pour réduire la dépendance aux générateurs diesel locaux. Merci d’utiliser l’eau et l’électricité avec modération et d’éteindre la climatisation et les lumières lorsque vous quittez la chambre.", "El agua dulce es limitada en Koh Tao. La electricidad llega a la isla mediante una conexión submarina a la red, desarrollada para reducir la dependencia de los generadores diésel locales. Usa el agua y la electricidad de forma responsable y apaga el aire acondicionado y las luces cuando salgas de la habitación.");
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

  add("Office hours are 10:30 AM–7:30 PM Bangkok time, Tuesday–Sunday. If the office is unavailable, Bamboo Beach Bar may accept luggage from 11:00 AM. No storage is currently available before 11:00 AM.", "เวลาทำการของสำนักงานคือ 10:30–19:30 น. ตามเวลาประเทศไทย วันอังคาร–วันอาทิตย์ หากสำนักงานไม่เปิดให้บริการ Bamboo Beach Bar อาจรับฝากสัมภาระตั้งแต่ 11:00 น. ขณะนี้ไม่มีบริการรับฝากสัมภาระก่อน 11:00 น.", "办公室开放时间为周二至周日 10:30–19:30（曼谷时间）。办公室无法接待时，Bamboo Beach Bar 可能可从 11:00 起代存行李。目前 11:00 前不提供行李寄存。", "Офис открыт со вторника по воскресенье с 10:30 до 19:30 по бангкокскому времени. Если офис недоступен, Bamboo Beach Bar может принять багаж с 11:00. До 11:00 хранение багажа сейчас недоступно.", "Das Büro ist dienstags bis sonntags von 10:30 bis 19:30 Uhr Bangkoker Zeit geöffnet. Wenn das Büro nicht verfügbar ist, kann die Bamboo Beach Bar gegebenenfalls ab 11:00 Uhr Gepäck annehmen. Vor 11:00 Uhr ist derzeit keine Gepäckaufbewahrung verfügbar.", "Le bureau est ouvert du mardi au dimanche de 10 h 30 à 19 h 30, heure de Bangkok. Lorsque le bureau n’est pas disponible, le Bamboo Beach Bar peut éventuellement accepter les bagages à partir de 11 h. Aucune consigne n’est actuellement disponible avant 11 h.", "La oficina abre de martes a domingo, de 10:30 a 19:30, hora de Bangkok. Si la oficina no está disponible, Bamboo Beach Bar puede aceptar equipaje desde las 11:00 cuando sea posible. Actualmente no hay guardaequipaje antes de las 11:00.");
  add("Our office hours are 10:30 AM–7:30 PM Bangkok time, Tuesday–Sunday. If the office is unavailable, luggage can be stored at Bamboo Beach Bar from 11:00 AM when applicable. We do not currently have luggage storage for early-morning arrivals before 11:00 AM. Ask the Concierge to arrange it and include whether this is for arrival or departure, the requested time and number of bags.", "สำนักงานเปิดวันอังคาร–วันอาทิตย์ เวลา 10:30–19:30 น. ตามเวลาประเทศไทย หากสำนักงานไม่เปิดให้บริการ สามารถฝากสัมภาระที่ Bamboo Beach Bar ได้ตั้งแต่ 11:00 น. ตามความเหมาะสม ขณะนี้เราไม่มีบริการรับฝากสัมภาระสำหรับผู้ที่มาถึงช่วงเช้าตรู่ก่อน 11:00 น. โปรดขอให้ Concierge ช่วยจัดการ พร้อมระบุว่าเป็นวันมาถึงหรือวันออกเดินทาง เวลาที่ต้องการ และจำนวนกระเป๋า", "办公室于周二至周日 10:30–19:30（曼谷时间）开放。办公室无法接待时，可视情况从 11:00 起将行李寄存在 Bamboo Beach Bar。目前我们不为 11:00 前抵达的客人提供行李寄存。请让礼宾助手协助安排，并说明是抵达还是离店、所需时间及行李件数。", "Офис открыт со вторника по воскресенье с 10:30 до 19:30 по бангкокскому времени. Если офис недоступен, при наличии возможности багаж можно оставить в Bamboo Beach Bar с 11:00. Сейчас мы не предлагаем хранение для ранних прибытий до 11:00. Попросите консьержа всё организовать и укажите, относится ли запрос к прибытию или отъезду, желаемое время и количество сумок.", "Unser Büro ist dienstags bis sonntags von 10:30 bis 19:30 Uhr Bangkoker Zeit geöffnet. Wenn das Büro nicht verfügbar ist, kann Gepäck je nach Möglichkeit ab 11:00 Uhr in der Bamboo Beach Bar aufbewahrt werden. Für frühe Ankünfte vor 11:00 Uhr bieten wir derzeit keine Gepäckaufbewahrung an. Bitten Sie den Concierge um die Organisation und nennen Sie Ankunft oder Abreise, die gewünschte Uhrzeit und die Anzahl der Gepäckstücke.", "Notre bureau est ouvert du mardi au dimanche de 10 h 30 à 19 h 30, heure de Bangkok. Lorsque le bureau n’est pas disponible, les bagages peuvent, selon les possibilités, être déposés au Bamboo Beach Bar à partir de 11 h. Nous ne proposons actuellement aucune consigne pour les arrivées matinales avant 11 h. Demandez au concierge de l’organiser et précisez s’il s’agit de l’arrivée ou du départ, l’heure souhaitée et le nombre de bagages.", "Nuestra oficina abre de martes a domingo, de 10:30 a 19:30, hora de Bangkok. Si la oficina no está disponible, el equipaje puede dejarse en Bamboo Beach Bar desde las 11:00 cuando sea posible. Actualmente no ofrecemos guardaequipaje para llegadas tempranas antes de las 11:00. Pide al conserje que lo organice e indica si es para la llegada o la salida, la hora solicitada y el número de bultos.");

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
