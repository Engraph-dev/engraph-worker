export function getVersionString(): string {
	const nowDate = new Date()
	const nowYear = nowDate.getFullYear()
	const nowMonth = nowDate.getMonth() + 1
	const nowDayDate = nowDate.getDate()

	return `v${nowYear}.${nowMonth}.${nowDayDate}`
}

export function generateInitString(): string {
	return (
		"ArnitDOS" + getVersionString() + ". Type `help` for more information."
	)
}

export const RESUME_LINK =
	"https://drive.google.com/file/d/1LjvdoobpPFOk9vGUV5reF9N_pN5UfO5i/view" as const

export const LIST_DATA = {
	EXPERIENCE: [
		"I have worked as a Backend Developer Intern at Engaze.in from June 2024 to August 2024",
		"I've also worked as a Freelance Web Developer for Pixels and Grids, developing websites and web applications",
		"I've worked as a MERN Stack Developer Intern at CTO-Ninja from June 2023 to October 2023",
		"I was also a part of GDSC DJSCE's Web Development Co-Committee for the academic year 2023-2024",
		"I'm currently at the forefront of GDG DJSCE, as the Co-Lead for the academic year 2024-2025",
	],
	PROJECTS: [
		"I've worked on various projects in Typescript, Javascript, Postgres, Python, C++ and the MERN/PERN Stack. Here are some of my personal favorites.",
		"To learn more about each project, use the `project <name>` command, and use one of the names in the [square brackets] below",
		"[mimicai] A customisable AI mimc for having custom conversations",
		"[thinq] ThinQ a full stack online education platform using NextJS and PostgreSQL",
		"[blitzai] BlitzAI is a cutting-edge SaaS platform designed to empower content creators by integrating AI seamlessly into their video creation workflows",
		"[nutrino] Nutrino is a web application designed to help individuals with allergies and dietary restrictions navigate the world of food effortlessly",
		"[versura] Versura is a revolutionary blockchain based crowdfunding platform, developed as an academic project at SVKM's SBMP",
		"[axess] Axess is a prize-winning QR-Code based access control system integrating fine-tuned permissions and user management",
		"[gpiostudio] GPIOStudio is a GUI for developing Python scripts for the Raspberry Pi GPIO, built using Qt5 and C++11",
		"[drone] I've worked on developing software for integrating voice control with PixHawk drones using Raspberry Pis",
	],
	HOBBIES: [
		"I love astronomy, stargazing, working out, and last but not the least, tinkering! You'll always find a spare screwdriver or patch cord in my bag ;)",
	],
	ACADEMICS: [
		"Here are some of my academic achievements -",
		"I'm currently pursuing a B.Tech Degree in Computer Engineering at SVKM's DJSCE",
		"I hold a Diploma in Computer Engineering from SVKM's Shri Bhagubhai Mafatlal Polytechnic",
		"I've participated in various technical competitions and hackathons, mosty notably winning the 2nd Prize at KJSCE Devopia Hackathon",
		"I have also had the honor of being part of the organising committee as the Technical Head for PolyHacks 1.0 Hackathon at SVKM's SBMP",
	],
} as Record<string, string[]>

type ProjectInfo = {
	projectTitle: string
	projectDescription: string
	githubLink: string
	projectNote?: string
	projectDuration?: string
}

export const PROJECT_DATA: Record<string, ProjectInfo> = {
	MIMICAI: {
		projectTitle: "MimicAI - A customisable AI mimic for conversations",
		projectDescription:
			"MimicAI is a customisable AI mimic for users to have conversations with. " +
			"It allows users to fork conversations from a message, trying out different messages and responses",
		githubLink: "https://mimicai.arnitdo.dev",
		projectDuration: "12/2024 - 12/2024",
		projectNote: "Developed in under 24 hours",
	},
	THINQ: {
		projectTitle: "ThinQ - A virtual classroom enhancement platform",
		projectDescription:
			"ThinQ is a comprehensive solution for virtual classrooms, providing a wide range of features to enhance the online learning experience." +
			"It features calendar integrations, video calling, attention detection among a wide variety of features designed to improve online classroom teaching",
		projectNote: "This project was developed at PICT TechFiesta 2024",
		githubLink: "https://github.com/arnitdo/ThinQ",
		projectDuration: "02/2024 - 04/2023",
	},
	BLITZAI: {
		projectTitle: "BlitzAI: Next-Gen AI Video Creation SaaS",
		projectDescription:
			"BlitzAI is a cutting-edge SaaS platform designed to empower content creators by integrating AI seamlessly into their video creation workflows." +
			"With a user-friendly UI and a modular approach, BlitzAI allows users to pick and choose AI-driven features at any step of the content creation process.",
		projectNote: "This project was developed at Datathon 3.0 at KJSCE",
		githubLink: "https://github.com/arnitdo/Blitz.AI-Datathon-3",
		projectDuration: "02/2024",
	},
	NUTRINO: {
		projectTitle: "Nutrino: Your Own Food Assistant",
		projectDescription:
			"Nutrino is a web application designed to help individuals with allergies and dietary restrictions navigate the world of food effortlessly. " +
			"By utilizing advanced machine learning models, Nutrino provides users with powerful tools to detect ingredients, " +
			"suggest alternatives, and offer a delightful cooking experience.",
		projectNote: "This project was developed at TSEC Hack24",
		githubLink: "https://github.com/arnitdo/Nutrino",
		projectDuration: "01/2024 - 02/2024",
	},
	VERSURA: {
		projectTitle:
			"Versura - A revolutionary blockchain based crowdfunding platform",
		projectDescription:
			"Versura is a web+blockchain based crowdfunding platform developed as part of " +
			"academic curriculum. Integrated AWS RDS for database provisioning and storage. " +
			"Implemented project front-end using NextJS and Elastic UI. Blockchain" +
			"functionality implemented using Metamask and Web3.js",
		projectNote:
			"This project was developed as part of an academic project requirement for completing my Diploma in Computer Engineering",
		githubLink: "https://github.com/arnitdo/versura",
		projectDuration: "02/2023 - 06/2023",
	},
	AXESS: {
		projectTitle: "Axess - A innovative access control system",
		projectDescription:
			"Axess is an innovative QR-Code based access control management system developed at VESP's " +
			"Technothon 2023. It integrates a fine-tuned permission system with a scalable QR-based location and entry/exit " +
			"point-of-transit systems. Such functionality was achieved using NextUI, Google Cloud Firebase Firestore, and NextJS",
		githubLink: "https://github.com/arnitdo/Axess",
		projectNote:
			"This project won the Third Prize at VESP's Technothon 2023",
		projectDuration: "04/2023",
	},
	GPIOSTUDIO: {
		projectTitle: "GPIO Studio",
		projectDescription:
			"Created a GPIO-Interfacing script generator GUI for Raspberry Pis and other IoT " +
			"devices. Developed and utilized skills acquired in C++11 and Qt5 GUI Framework. " +
			"Integrated various open source third-party libraries to provide data parsing and " +
			"storage.",
		githubLink: "https://github.com/arnitdo/GPIOStudio",
		projectDuration: "08/2021 - 01/2022",
	},
	DRONE: {
		projectTitle: "Voice Controlled Drone",
		projectDescription:
			"Developed a Voice Controlled Drone, implementing various protocols to enable " +
			"communication between a PixHawk Flight Controller and Raspberry Pi SBC. Uses " +
			"Google Cloud-based speech to text processing to analyze voice commands",
		projectDuration: "01/2023 - 06/2023",
		githubLink: "https://github.com/arnitdo/Voice-Controlled-Drone",
		projectNote:
			"This was a collaborative effort as part of an academic project",
	},
} as const

export function isURL(urlLikeString: string) {
	try {
		const actualURL = new URL(urlLikeString)
		return (
			actualURL.protocol.startsWith("http") ||
			actualURL.protocol.startsWith("mailto")
		)
	} catch {
		return false
	}
}

// ^^vv<><>ba
export const KONAMI_CODE = [
	"ArrowUp",
	"ArrowUp",
	"ArrowDown",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"ArrowLeft",
	"ArrowRight",
	"b",
	"a",
]
